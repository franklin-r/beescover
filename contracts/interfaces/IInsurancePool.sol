// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

interface IInsurancePool {
	error InsufficientWithdrawal();
	error InsufficientBalance();
	error InvalidCoverageAmount();
	error CoverageTooShort(uint256 _request, uint256 _min);
	error InvalidRisk();
	error WithdrawalNotReady();
	error InvalidStatuys();
	error NotCoverHolder();
	error InvalidStatus();
	error NotArbitrator();
	error AlreadyRuled();
	error WithdrawRequestNotAllowed();
	error FailedToWithdrawFullAmount(uint256 _expected, uint256 _actual);

	event GovernanceTokenAprUpdated(uint256 indexed _poolId, uint16 _oldApr, uint16 _newApr);
	event RiskUpdated(uint256 indexed _poolId, uint8 _oldRisk, uint8 _newRisk);
	event WithdrawalRequested(uint256 indexed _poolId, address indexed _addr, uint256 _amount, uint256 _unlockTime);
	event WithdrawalExecuted(uint256 indexed _poolId, address indexed _addr, uint256 _amount);
	event CoveragePurchased(uint256 indexed _poolId, address indexed _addr, uint256 _amount, uint256 _duration, uint256 _premium, uint256 _tokenId);
	event LiquidityProvided(uint256 indexed _poolId, address indexed _addr, uint256 _amount, uint256 _shares);
	event RewardDistributed(address indexed _addr, uint256 _amount);
}