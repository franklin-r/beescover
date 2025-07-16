// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IAToken} from "@aave/core-v3/contracts/interfaces/IAToken.sol";
import {DataTypes} from "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";
import {IInsurancePool} from "./interfaces/IInsurancePool.sol";
import {IWhitelists} from "./interfaces/IWhitelists.sol";
import {IFund} from "./interfaces/IFund.sol";
import {ICoverageProof} from "./interfaces/ICoverageProof.sol";
import {IBeesCoverToken} from "./interfaces/IBeesCoverToken.sol";
import {IArbitrator} from "./interfaces/IArbitrator.sol";
import {IArbitrable} from "./interfaces/IArbitrable.sol";
import {IEvidence} from "./interfaces/IEvidence.sol";
import {LPToken} from "./LPToken.sol";
import {Types} from "./types/Types.sol";

/// @title InsurancePool
/// @notice This contract requires post-deployment configuration:
///					- Grant INSURANCE_POOL_ADMIN_ROLE to TimelockController (in case of parameter updates through DAO).
contract InsurancePool is IInsurancePool, IArbitrable, IEvidence, AccessControl {
	using Strings for uint256;

	bytes32 public constant INSURANCE_POOL_ADMIN_ROLE = keccak256("INSURANCE_POOL_ADMIN_ROLE");

	// Contracts
	IWhitelists immutable whitelists;
	IFund immutable treasury;
	IFund immutable reserve;
	IBeesCoverToken immutable beesCoverToken;
	ICoverageProof immutable coverageProof;
	IArbitrator immutable arbitrator;
	IERC20 immutable asset;
	LPToken public immutable lpToken;
	IPool constant aavePool = IPool(0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951);

	// Pool config
	uint256 public immutable poolId;
	uint256 constant WITHDRAWAL_DELAY = 1 minutes;
	uint32 constant MIN_COVERAGE_LENGTH = 1;	// Days
	uint16 public govTokenApr;
	Types.CoverType public coverType;
	uint8 public risk;
	uint8 constant FEES = 50;
	uint8 constant MAX_USE = 75;

	// Liquidity
	uint256 public totalLiquidity;
	uint256 public freeLiquidity;
	uint256 public totalLocked;
	uint256 public totalFromReserve;
	mapping (address => uint256) public depositTimestamps;

	// Withdrawal
	mapping (address => Types.WithdrawalRequest) public withdrawalRequests;

	// Claims
	mapping (uint256 => Types.Claim) public claims;
	uint256 immutable metaEvidenceId;
	uint256 private nextClaimId;
	mapping (uint256 => uint256) public disputeToClaim;

	modifier onlyValidRisk(uint8 _risk) {
		require(_risk > 0 && _risk < 10, InvalidRisk());
		_;
	}

	constructor(
		IWhitelists _whitelists,
		IFund _treasury,
		IFund _reserve,
		IBeesCoverToken _beesCoverToken,
		ICoverageProof _coverageProof,
		IArbitrator _arbitrator,
		IERC20 _asset,
		uint256 _poolId,
		uint8 _risk,
		string memory _metaEvidence
	) onlyValidRisk(_risk) {
		_setRoleAdmin(INSURANCE_POOL_ADMIN_ROLE, INSURANCE_POOL_ADMIN_ROLE);
		_grantRole(INSURANCE_POOL_ADMIN_ROLE, msg.sender);
		whitelists = _whitelists;
		treasury = _treasury;
		reserve = _reserve;
		coverageProof = _coverageProof;
		beesCoverToken = _beesCoverToken;
		arbitrator = _arbitrator;
		asset = _asset;
		lpToken = new LPToken(
			string.concat("BeesCover_poolId_", _poolId.toString(), "_Depeg_LPToken"),
			string.concat("poolId_", _poolId.toString(), "_Depeg_LPT")
		);
		poolId = _poolId;
		govTokenApr = 500;	// 500 bps = 5 %
		risk = _risk;
		metaEvidenceId = _poolId;
		emit MetaEvidence(metaEvidenceId, _metaEvidence);
	}

	function setRisk(uint8 _risk)
		external
		onlyRole(INSURANCE_POOL_ADMIN_ROLE)
		onlyValidRisk(_risk)
	{
		uint8 oldRisk = risk;
		risk = _risk;
		emit RiskUpdated(poolId, oldRisk, _risk);
	}

	function setGovTokenAPR(uint16 _apr) external onlyRole(INSURANCE_POOL_ADMIN_ROLE) {
		uint16 oldApr = govTokenApr;
		govTokenApr = _apr;
		emit GovernanceTokenAprUpdated(poolId, oldApr, _apr);
	}

	function deposit(uint256 _amount) external {
    asset.transferFrom(msg.sender, address(this), _amount);
    asset.approve(address(aavePool), _amount);
    aavePool.supply(address(asset), _amount, address(this), 0);

		// Get pool's total value (capital + interests + premiums)
    uint256 totalAssets = _getPoolValue();
    uint256 totalShares = lpToken.totalSupply();

    uint256 shares;
    if (totalShares == 0 || totalAssets == 0) {
        shares = _amount; // 1:1 at first deposit
    } else {
        shares = (_amount * totalShares) / totalAssets;
    }

		if (depositTimestamps[msg.sender] == 0) {
			depositTimestamps[msg.sender] = block.timestamp;
		}

    lpToken.mint(msg.sender, shares);

    totalLiquidity = totalLiquidity + _amount;
		uint256 totalValue = totalLiquidity;
		uint256 valueFromReserve = totalFromReserve;

		// Pay-back amount borrowed from reserve
		if (valueFromReserve > 0) {
			uint256 amountToPayBack;
			uint256 maxUsage = (MAX_USE * totalValue) / 100;
			if (totalLocked > maxUsage) {
				amountToPayBack = valueFromReserve - (totalLocked - maxUsage);
			}
			else {
				amountToPayBack = valueFromReserve;
				freeLiquidity = ((MAX_USE * totalValue) / 100) - totalLocked;
			}
			totalFromReserve = valueFromReserve - amountToPayBack;
			asset.transfer(address(reserve), amountToPayBack);
		}
		else {
			freeLiquidity = ((MAX_USE * totalValue) / 100) - totalLocked;
		}

    emit LiquidityProvided(poolId, msg.sender, _amount, shares);
	}

	function requestWithdrawal(uint256 _shares) external {
    require(_shares > 0, InsufficientWithdrawal());
    require(lpToken.balanceOf(msg.sender) >= _shares, InsufficientBalance());
		require(withdrawalRequests[msg.sender].unlockTimestamp == 0, WithdrawRequestNotAllowed());

    uint256 unlockTime = block.timestamp + WITHDRAWAL_DELAY;
    withdrawalRequests[msg.sender] = Types.WithdrawalRequest({
			amount: _shares,
			unlockTimestamp: unlockTime
		});
    emit WithdrawalRequested(poolId, msg.sender, _shares, unlockTime);
  }

	function executeWithdrawal() external {
    Types.WithdrawalRequest memory req = withdrawalRequests[msg.sender];
    require(block.timestamp >= req.unlockTimestamp, WithdrawalNotReady());
    delete withdrawalRequests[msg.sender];

    // Compute real value to withdraw
    uint256 totalAssets = _getPoolValue();
    uint256 totalShares = lpToken.totalSupply();
    uint256 amountToWithdraw = (req.amount * totalAssets) / totalShares;

    lpToken.burnFrom(msg.sender, req.amount);

    aavePool.withdraw(address(asset), amountToWithdraw, msg.sender);

    totalLiquidity = totalLiquidity - req.amount;
		uint256 totalValue = totalLiquidity;
		uint256 valueLocked = totalLocked;
		uint256 maxUsage = (MAX_USE * totalValue) / 100;

		// Keep enough liquidity for coverage
		if (valueLocked > maxUsage) {
			uint256 amountToBorrow = valueLocked - maxUsage;
			totalFromReserve = totalFromReserve + amountToBorrow;
			freeLiquidity = 0;
			reserve.transferFund(
				address(this),
				address(asset),
				0,
				amountToBorrow
			);
		}
		else {
			freeLiquidity = maxUsage - valueLocked;
		}

		uint256 stakingDuration = (block.timestamp - depositTimestamps[msg.sender]) / 1 days;
		delete depositTimestamps[msg.sender];

		uint256 rewardAmount = _computeWithdrawalReward(req.amount, stakingDuration, msg.sender);
    beesCoverToken.mint(msg.sender, rewardAmount);

    emit WithdrawalExecuted(poolId, msg.sender, amountToWithdraw);
	}

	function computePremium(uint256 _coverAmount, uint256 _coverDuration)
		external
		view
		returns (uint256)
	{
		return _computePremium(_coverAmount, _coverDuration);
	}

	function buyCoverage(uint256 _coverAmount, uint256 _coverDuration ) external {
		require(_coverAmount > 0 && _coverAmount <= freeLiquidity, InvalidCoverageAmount());
		require(_coverDuration >= MIN_COVERAGE_LENGTH, CoverageTooShort(_coverDuration, MIN_COVERAGE_LENGTH));

		totalLocked = totalLocked + _coverAmount;
		uint256 premium = _computePremium(_coverAmount, _coverDuration);
		uint256 collectedFees = premium * FEES / 100;
		uint256 distributedPremium;
		unchecked {
			// Already checked that it won't underflow
			freeLiquidity = freeLiquidity - _coverAmount;
			// `collectedFees` is a portion of `premium`
			distributedPremium = premium - collectedFees;
		}

		// Requires InsurancePool to be approved an amount of `premium` first
		asset.transferFrom(msg.sender, address(this), premium);

		asset.approve(address(aavePool), premium);
		aavePool.supply(address(asset), distributedPremium, address(this), 0);
		aavePool.supply(address(asset), collectedFees, address(treasury), 0);

		uint256 tokenId = coverageProof.safeMint(msg.sender, _coverAmount, _coverDuration * (1 days), poolId);

		emit CoveragePurchased(poolId, msg.sender, _coverAmount, _coverDuration, premium, tokenId);
	}

	function createClaim(uint256 _tokenId, string calldata _evidenceURI)
		external
		payable
	{
		require(coverageProof.ownerOf(_tokenId) == msg.sender, NotCoverHolder());

		Types.CoverageInfo memory coverageInfo = coverageProof.getCoverageInfos(_tokenId);

		// TODO: implement grace period
		require(coverageInfo.status == Types.CoverageStatus.Active, InvalidStatus());

		// 3 answer options: 0: Abstain / 1: Yes / 2: No
		uint256 disputeId = arbitrator.createDispute{value: msg.value}(3);
		uint256 claimId = nextClaimId++;

		claims[claimId] = Types.Claim({
			claimant: msg.sender,
			tokenId: _tokenId,
			disputeId: disputeId,
			poolId: coverageInfo.poolId,
			value: coverageInfo.value,
			ruling: 0,
			evidenceURI: _evidenceURI,
			asset: address(asset),
			ruled: false
		});

		coverageProof.setCoverageStatus(_tokenId, Types.CoverageStatus.Claimed);

		disputeToClaim[disputeId] = claimId;

		emit Evidence(arbitrator, claimId, msg.sender, _evidenceURI);
		emit Dispute(arbitrator, disputeId, metaEvidenceId, claimId);
	}

	function rule(uint256 _disputeID, uint256 _ruling) external {
		require(msg.sender == address(arbitrator), NotArbitrator());

		uint256 claimId = disputeToClaim[_disputeID];
		Types.Claim storage claim = claims[claimId];
		require(!claim.ruled, AlreadyRuled());

		claim.ruled = true;
		claim.ruling = _ruling;

		if (_ruling == 1) { // Yes
			uint256 totalValue = totalLiquidity;
			uint256 valueFree = freeLiquidity;
			uint256 valueLocked = totalLocked;
			uint256 aaveWithdrawAmount;

			valueLocked = valueLocked - claim.value;

			if (claim.value <= totalValue) {
				totalValue = totalValue - claim.value;
				valueFree = ((MAX_USE * totalValue) / 100) - valueLocked;
				aaveWithdrawAmount = claim.value;
			}
			else {	// Can't handle this case
				aaveWithdrawAmount = IERC20(aavePool.getReserveData(claim.asset).aTokenAddress).balanceOf(address(this));
				totalValue = 0;
				valueFree = 0;
			}

			totalLiquidity = totalValue;
			freeLiquidity = valueFree;
			totalLocked = valueLocked;

			uint256 withdrawn = aavePool.withdraw(claim.asset, claim.value, claim.claimant);
			require(withdrawn == claim.value, FailedToWithdrawFullAmount(claim.value, withdrawn));
			coverageProof.setCoverageStatus(claim.tokenId, Types.CoverageStatus.PaidOut);
		}
		else {
			Types.CoverageInfo memory coverageInfo = coverageProof.getCoverageInfos(claim.tokenId);
			if (block.timestamp < coverageInfo.endTimestamp) {
				coverageProof.setCoverageStatus(claim.tokenId, Types.CoverageStatus.Active);
			}
			else {
				coverageProof.setCoverageStatus(claim.tokenId, Types.CoverageStatus.Expired);
			}
		}
		emit Ruling(IArbitrator(msg.sender), _disputeID, _ruling);
	}

	function _computePremium(uint256 _coverAmount, uint256 _coverDuration)
		internal
		view
		returns (uint256)
	{
		// Base rate: 1% annualized
    uint256 baseRate = 100; // 1% in basis points (bps)
    uint256 riskFactor = uint256(risk) * 50; // 0.5% per unit of risk score

    uint256 totalRateBps = baseRate + riskFactor;

    // Scale premium by duration
    uint256 annualizedAmount = (_coverAmount * _coverDuration) / 365;

    // Raw premium in token units
    uint256 premium = (annualizedAmount * totalRateBps) / 10_000;

    // Apply penalty if coverage is too close to liquidity
    if (_coverAmount * 100 > freeLiquidity * 80) {
        premium = (premium * 120) / 100; // +20% surcharge
    }
    return premium;
	}

	function _getPoolValue() internal view returns (uint256) {
    address aTokenAddress = aavePool.getReserveData(address(asset)).aTokenAddress;
    uint256 scaled = IAToken(aTokenAddress).scaledBalanceOf(address(this));
    uint256 index = aavePool.getReserveNormalizedIncome(address(asset));
    return (scaled * index) / 1e27;
	}

	function _computeWithdrawalReward(uint256 _amount, uint256 _duration, address _addr)
    internal
    returns (uint256)
	{
		uint256 rewards = (_amount * govTokenApr * _duration) / (365 * 10_000);
		emit RewardDistributed(_addr, rewards);
		return rewards;
	}
}