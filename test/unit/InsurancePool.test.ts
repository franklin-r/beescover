import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
	InsurancePool,
	IERC20,
	BeesCoverToken,
	Fund,
	CoverageProof,
	Arbitrator,
	IPool
} from "../../typechain-types";
import {
	buyCoverageFixture,
	deployInsurancePoolFixture,
	extremeRequestWithdrawalFixture,
	extremeWithdrawalFixture,
	provideLiquidityFixture,
	removeAavePoolSupplyCapFixture,
	requestWithdrawalFixture,
	ruleAbstainFixture,
	ruleYesFixture,
	ruleNoFixture,
	extremeRuleYesFixture
} from "../utils/fixtures";
import { CoverageStatus } from "../utils/enums";
import { Asset, getOtherUser } from "../utils/helpers";

describe("InsurancePool Tests", () => {

	// ============================== DEPLOYMENT ============================== //

	describe("constructor()", () => {
		let insurancePool: InsurancePool;
		let admin: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(deployInsurancePoolFixture);
			insurancePool = fixture.insurancePool;
			admin = fixture.admin;
		});

		it("Pool ID should be set accordingly", async () => {
			expect(await insurancePool.poolId()).to.equal(0n);
		});

		it("Insurance admin should have according role", async () => {
			const INSURANCE_ADMIN_ROLE = await insurancePool.INSURANCE_POOL_ADMIN_ROLE();
			expect(await insurancePool.hasRole(INSURANCE_ADMIN_ROLE, admin.address)).to.equal(true);
		});

		it("Risk should be set accordingly", async () => {
			expect(await insurancePool.risk()).to.equal(5n);
		});
	});

	// ================================ setRisk ================================ //

	describe("setRisk()", () => {
		let insurancePool: InsurancePool;
		let admin: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(deployInsurancePoolFixture);
			insurancePool = fixture.insurancePool;
			admin = fixture.admin;
		});

		it("Non valid input should revert", async () => {
			await expect(insurancePool.connect(admin).setRisk(10n)).to.be
			.revertedWithCustomError(
				insurancePool,
				"InvalidRisk"
			);
		});

		it("Risk should be updated", async () => {
			const newRisk = 2n;
			await insurancePool.connect(admin).setRisk(newRisk);
			expect(await insurancePool.risk()).to.equal(newRisk);
		});

		it("Setting risk should emit event", async () => {
			const poolId = await insurancePool.poolId();
			const newRisk = 2n;
			const prevRisk = await insurancePool.risk();
			await expect(insurancePool.connect(admin).setRisk(newRisk)).to
			.emit(
				insurancePool,
				"RiskUpdated"
			)
			.withArgs(
				poolId,
				prevRisk,
				newRisk
			);
		});
	});

	// ============================ setGovTokenApr ============================ //

	describe("setGovTokenApr()", () => {
		let insurancePool: InsurancePool;
		let admin: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(deployInsurancePoolFixture);
			insurancePool = fixture.insurancePool;
			admin = fixture.admin;
		});

		it("APR should be updated", async () => {
			const newAPR = 1000n;
			await insurancePool.connect(admin).setGovTokenAPR(newAPR);
			expect(await insurancePool.govTokenApr()).to.equal(newAPR);
		});

		it("Setting APR should emit event", async () => {
			const poolId = await insurancePool.poolId();
			const newAPR = 1000n;
			const prevAPR = await insurancePool.govTokenApr();
			await expect(insurancePool.connect(admin).setGovTokenAPR(newAPR)).to
			.emit(
				insurancePool,
				"GovernanceTokenAprUpdated"
			)
			.withArgs(
				poolId,
				prevAPR,
				newAPR
			);
		});
	});

	// ================================ deposit [First Deposit] ================================ //

	describe("deposit() [First Deposit]", () => {
		let assetSwitch: Asset;
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let assetDecimals: number;
		let aavePool: IPool;
		let reserveFund: Fund;
		beforeEach(async () => {
			const fixture = await loadFixture(removeAavePoolSupplyCapFixture);
			assetSwitch = fixture.assetSwitch;
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			assetDecimals = fixture.assetDecimals;
			aavePool = fixture.aavePool;
			reserveFund = fixture.reserveFund;
		});

		it("InsurancePool should receive aTokens after deposit", async () => {
			const aTokenAddr = (await aavePool.getReserveData(asset.getAddress())).aTokenAddress;
			const aToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", aTokenAddr)) as unknown as IERC20;

			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);

			const aTokenBalanceBeforeDeposit = await aToken.balanceOf(insurancePool.getAddress());
			//console.log(`aTokenBalanceBeforeDeposit: ${aTokenBalanceBeforeDeposit}`);

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);
			const aTokenBalanceAfterDeposit = await aToken.balanceOf(insurancePool.getAddress());
			//console.log(`aTokenBalanceAfterDeposit: ${aTokenBalanceAfterDeposit}`);

			expect(aTokenBalanceAfterDeposit).to.be.greaterThan(aTokenBalanceBeforeDeposit);
		});

		it("Deposit timestamp should be registered", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);
			const block = await ethers.provider.getBlock("latest");

			if (!block) {
				throw new Error("Block is null. Aborting test");
			}

			// +2 to account for delay
			const currentTimestamp = BigInt(block.timestamp) + 2n;

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			// May fail when executed on forked network due to delay.
			expect(await insurancePool.depositTimestamps(insurer.address)).to.equal(currentTimestamp);
		});

		it("Insurer should receive LPTokens after deposit", async() => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;

			const lpTokenBalanceBeforeDeposit = await lpToken.balanceOf(insurer.address);
			// console.log(`lpTokenBalanceBeforeDeposit! ${lpTokenBalanceBeforeDeposit}`);

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			const lpTokenBalanceAfterDeposit = await lpToken.balanceOf(insurer.address);
			// const insurer1_lpTokenBalance = await lpToken.balanceOf("0xc0dEC722b431c02a0787F349587B783A0f2F3281");
			// const insurer2_lpTokenBalance = await lpToken.balanceOf("0x19Bf4fE746c370E2930cD8C1b3DcFA55270c8eD7");
			// console.log(`insurer1_lpTokenBalance! ${insurer1_lpTokenBalance}`);
			// console.log(`insurer2_lpTokenBalance! ${insurer2_lpTokenBalance}`);
			// console.log(`lpTokenBalanceAfterDeposit! ${lpTokenBalanceAfterDeposit}`);

			expect(lpTokenBalanceAfterDeposit).to.be.greaterThan(lpTokenBalanceBeforeDeposit);
		});

		it("Total liquidity should be updated after deposit", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);

			const totalLiquidityBeforeDeposit = await insurancePool.totalLiquidity();

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			const totalLiquidityAfterDeposit = await insurancePool.totalLiquidity();

			expect(totalLiquidityAfterDeposit).to.equal(totalLiquidityBeforeDeposit + depositAmount);
		});

		it("Free liquidity should be updated after deposit", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);
			const MAX_USE = 75n;

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			const totalLiquidityAfterDeposit = await insurancePool.totalLiquidity();
			const freeLiquidityAfterDeposit = await insurancePool.freeLiquidity();
			const totalLocked = await insurancePool.totalLocked();

			expect(freeLiquidityAfterDeposit).to.equal((MAX_USE * totalLiquidityAfterDeposit / 100n) - totalLocked);
		});

		it("No transfer event related to pay back should happen", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);

			const balanceReserveFundBeforeDeposit = await asset.balanceOf(reserveFund);

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await expect(insurancePool.connect(insurer).deposit(depositAmount));

			const balanceReserveFundAfterDeposit = await asset.balanceOf(reserveFund);
			expect(balanceReserveFundAfterDeposit).to.equal(balanceReserveFundBeforeDeposit);
		});

		it("Deposit should emit event", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);
			const poolId = await insurancePool.poolId();
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			const tx = await insurancePool.connect(insurer).deposit(depositAmount);
			const shares = await lpToken.balanceOf(insurer.address);

			await expect(tx).to.emit(insurancePool, "LiquidityProvided")
			.withArgs(
				poolId,
				insurer.address,
				depositAmount,
				shares
			);
		});
	});

	// ================================ deposit [No Coverage Yet] ================================ //

	describe("deposit() [No Coverage Yet]", () => {
		let assetSwitch: Asset;
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let assetDecimals: number;
		let aavePool: IPool;
		let reserveFund: Fund;
		beforeEach(async () => {
			const fixture = await loadFixture(provideLiquidityFixture);
			assetSwitch = fixture.assetSwitch;
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			assetDecimals = fixture.assetDecimals;
			aavePool = fixture.aavePool;
			reserveFund = fixture.reserveFund;
		});

		it("InsurancePool should receive aTokens after deposit", async () => {
			const aTokenAddr = (await aavePool.getReserveData(asset.getAddress())).aTokenAddress;
			const aToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", aTokenAddr)) as unknown as IERC20;

			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);

			const aTokenBalanceBeforeDeposit = await aToken.balanceOf(insurancePool.getAddress());
			//console.log(`aTokenBalanceBeforeDeposit: ${aTokenBalanceBeforeDeposit}`);

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);
			const aTokenBalanceAfterDeposit = await aToken.balanceOf(insurancePool.getAddress());
			//console.log(`aTokenBalanceAfterDeposit: ${aTokenBalanceAfterDeposit}`);

			expect(aTokenBalanceAfterDeposit).to.be.greaterThan(aTokenBalanceBeforeDeposit);
		});

		it("Insurer should receive LPTokens after deposit", async() => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;

			const lpTokenBalanceBeforeDeposit = await lpToken.balanceOf(insurer.address);
			// console.log(`lpTokenBalanceBeforeDeposit! ${lpTokenBalanceBeforeDeposit}`);

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			const lpTokenBalanceAfterDeposit = await lpToken.balanceOf(insurer.address);
			// const insurer1_lpTokenBalance = await lpToken.balanceOf("0xc0dEC722b431c02a0787F349587B783A0f2F3281");
			// const insurer2_lpTokenBalance = await lpToken.balanceOf("0x19Bf4fE746c370E2930cD8C1b3DcFA55270c8eD7");
			// console.log(`insurer1_lpTokenBalance! ${insurer1_lpTokenBalance}`);
			// console.log(`insurer2_lpTokenBalance! ${insurer2_lpTokenBalance}`);
			// console.log(`lpTokenBalanceAfterDeposit! ${lpTokenBalanceAfterDeposit}`);

			expect(lpTokenBalanceAfterDeposit).to.be.greaterThan(lpTokenBalanceBeforeDeposit);
		});

		it("Total liquidity should be updated after deposit", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);

			const totalLiquidityBeforeDeposit = await insurancePool.totalLiquidity();

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			const totalLiquidityAfterDeposit = await insurancePool.totalLiquidity();

			expect(totalLiquidityAfterDeposit).to.equal(totalLiquidityBeforeDeposit + depositAmount);
		});

		it("Free liquidity should be updated after deposit", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);
			const MAX_USE = 75n;

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			const totalLiquidityAfterDeposit = await insurancePool.totalLiquidity();
			const freeLiquidityAfterDeposit = await insurancePool.freeLiquidity();
			const totalLocked = await insurancePool.totalLocked();

			expect(freeLiquidityAfterDeposit).to.equal((MAX_USE * totalLiquidityAfterDeposit / 100n) - totalLocked);
		});

		it("No transfer event related to pay back should happen", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);

			const balanceReserveFundBeforeDeposit = await asset.balanceOf(reserveFund);

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await expect(insurancePool.connect(insurer).deposit(depositAmount));

			const balanceReserveFundAfterDeposit = await asset.balanceOf(reserveFund);
			expect(balanceReserveFundAfterDeposit).to.equal(balanceReserveFundBeforeDeposit);
		});
	});

	// ======================= deposit [Coverage Already] ======================= //

	describe("deposit() [Coverage Already]", () => {
		let assetSwitch: Asset;
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let assetDecimals: number;
		let aavePool: IPool;
		let reserveFund: Fund;
		beforeEach(async () => {
			const fixture = await loadFixture(buyCoverageFixture);
			assetSwitch = fixture.assetSwitch;
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			assetDecimals = fixture.assetDecimals;
			aavePool = fixture.aavePool;
			reserveFund = fixture.reserveFund;
		});

		it("InsurancePool should receive aTokens after deposit", async () => {
			const aTokenAddr = (await aavePool.getReserveData(asset.getAddress())).aTokenAddress;
			const aToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", aTokenAddr)) as unknown as IERC20;

			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);

			const aTokenBalanceBeforeDeposit = await aToken.balanceOf(insurancePool.getAddress());
			//console.log(`aTokenBalanceBeforeDeposit: ${aTokenBalanceBeforeDeposit}`);

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);
			const aTokenBalanceAfterDeposit = await aToken.balanceOf(insurancePool.getAddress());
			//console.log(`aTokenBalanceAfterDeposit: ${aTokenBalanceAfterDeposit}`);

			expect(aTokenBalanceAfterDeposit).to.be.greaterThan(aTokenBalanceBeforeDeposit);
		});

		it("Insurer should receive LPTokens after deposit", async() => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;

			const lpTokenBalanceBeforeDeposit = await lpToken.balanceOf(insurer.address);
			// console.log(`lpTokenBalanceBeforeDeposit! ${lpTokenBalanceBeforeDeposit}`);

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			const lpTokenBalanceAfterDeposit = await lpToken.balanceOf(insurer.address);
			// const insurer1_lpTokenBalance = await lpToken.balanceOf("0xc0dEC722b431c02a0787F349587B783A0f2F3281");
			// const insurer2_lpTokenBalance = await lpToken.balanceOf("0x19Bf4fE746c370E2930cD8C1b3DcFA55270c8eD7");
			// console.log(`insurer1_lpTokenBalance! ${insurer1_lpTokenBalance}`);
			// console.log(`insurer2_lpTokenBalance! ${insurer2_lpTokenBalance}`);
			// console.log(`lpTokenBalanceAfterDeposit! ${lpTokenBalanceAfterDeposit}`);

			expect(lpTokenBalanceAfterDeposit).to.be.greaterThan(lpTokenBalanceBeforeDeposit);
		});

		it("Total liquidity should be updated after deposit", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);

			const totalLiquidityBeforeDeposit = await insurancePool.totalLiquidity();

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			const totalLiquidityAfterDeposit = await insurancePool.totalLiquidity();

			expect(totalLiquidityAfterDeposit).to.equal(totalLiquidityBeforeDeposit + depositAmount);
		});

		it("Free liquidity should be updated after deposit", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);
			const MAX_USE = 75n;

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			const totalLiquidityAfterDeposit = await insurancePool.totalLiquidity();
			const freeLiquidityAfterDeposit = await insurancePool.freeLiquidity();
			const totalLocked = await insurancePool.totalLocked();

			expect(freeLiquidityAfterDeposit).to.equal((MAX_USE * totalLiquidityAfterDeposit / 100n) - totalLocked);
		});

		it("No transfer event related to pay back should happen", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 10_000n * BigInt(10**assetDecimals);

			const balanceReserveFundBeforeDeposit = await asset.balanceOf(reserveFund.getAddress());

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await expect(insurancePool.connect(insurer).deposit(depositAmount));

			const balanceReserveFundAfterDeposit = await asset.balanceOf(reserveFund);
			expect(balanceReserveFundAfterDeposit).to.equal(balanceReserveFundBeforeDeposit);
		});
	});

	// ========= deposit [Extreme (Deposit after extreme withdrawal)] ========= //

	describe("deposit() [Extreme (Deposit after extreme withdrawal)]", () => {
		let assetSwitch: Asset;
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let assetDecimals: number;
		let reserveFund: Fund;
		beforeEach(async () => {
			const fixture = await loadFixture(extremeWithdrawalFixture);
			assetSwitch = fixture.assetSwitch;
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			assetDecimals = fixture.assetDecimals;
			reserveFund = fixture.reserveFund;
		});

		it("Total borrowed from reserve should decrease after deposit", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 5_000n * BigInt(10**assetDecimals);

			const totalFromReserveBeforeDeposit = await insurancePool.totalFromReserve();

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			expect(await insurancePool.totalFromReserve()).to.be.lessThan(totalFromReserveBeforeDeposit);
		});

		it("Insurance pool should pay back reserve fund after deposit", async () => {
			const {user: insurer} = await getOtherUser(assetSwitch);
			const depositAmount = 5_000n * BigInt(10**assetDecimals);

			const balanceReserveFundBeforeDeposit = await asset.balanceOf(reserveFund.getAddress());
			const balanceInsurancePoolBeforeDeposit = await asset.balanceOf(insurancePool.getAddress());

			await asset.connect(insurer).approve(insurancePool.getAddress(), depositAmount);

			await insurancePool.connect(insurer).deposit(depositAmount);

			expect(await asset.balanceOf(reserveFund.getAddress())).to.be.greaterThan(balanceReserveFundBeforeDeposit);
			expect(await asset.balanceOf(insurancePool.getAddress())).to.be.lessThan(balanceInsurancePoolBeforeDeposit);
		});
	});

	// =========================== requestWithdrawal =========================== //

	describe("requestWithdrawal()", () => {
		let insurancePool: InsurancePool;
		let insurer1: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(provideLiquidityFixture);
			insurancePool = fixture.insurancePool;
			insurer1 = fixture.insurer1;
		});

		it("Insufficient withdrawal should revert", async () => {
			await expect(insurancePool.connect(insurer1).requestWithdrawal(0n)).to.be
			.revertedWithCustomError(
				insurancePool,
				"InsufficientWithdrawal"
			);
		});

		it("Insufficient balance for withdrawal should revert", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const balance = await lpToken.balanceOf(insurer1.address);

			await expect(insurancePool.connect(insurer1).requestWithdrawal(balance + 1n)).to.be
			.revertedWithCustomError(
				insurancePool,
				"InsufficientBalance"
			);
		});

		it("Requesting two withdrawals should revert", async () => {
			await insurancePool.connect(insurer1).requestWithdrawal(10n);

			await expect(insurancePool.connect(insurer1).requestWithdrawal(20n)).to.be
			.revertedWithCustomError(
				insurancePool,
				"WithdrawRequestNotAllowed"
			);
		});

		it("Requesting withdrawal should register data", async () => {
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds
			const withdrawAmount = 1000n;
			await insurancePool.connect(insurer1).requestWithdrawal(withdrawAmount);

			const block = await ethers.provider.getBlock("latest");
			if (!block) {
				throw new Error("Block is null. Aborting test");
			}
			const currentTimestamp = BigInt(block.timestamp);

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			expect(withdrawReq[0]).to.equal(withdrawAmount);
			// May fail due to delay
			expect(withdrawReq[1]).to.equal(currentTimestamp + WITHDRAWAL_DELAY);
		});

		it("Requesting withdrawal should emit event", async () => {
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds
			const withdrawAmount = 1000n;
			const poolId = await insurancePool.poolId();

			const block = await ethers.provider.getBlock("latest");
			if (!block) {
				throw new Error("Block is null. Aborting test");
			}
			// +1n to account for delay
			const currentTimestamp = BigInt(block.timestamp) + 1n;

			// May fail because of delay
			await expect(insurancePool.connect(insurer1).requestWithdrawal(withdrawAmount)).to
			.emit(
				insurancePool,
				"WithdrawalRequested"
			)
			.withArgs(
				poolId,
				insurer1.address,
				withdrawAmount,
				currentTimestamp + WITHDRAWAL_DELAY
			);
		});
	});

	// ====================== executeWithdrawal [Normal] ====================== //

	describe("executeWithdrawal() [Normal]", () => {
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let beesCoverToken: BeesCoverToken;
		let insurer1: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(requestWithdrawalFixture);
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			beesCoverToken = fixture.beesCoverToken;
			insurer1 = fixture.insurer1;
		});

		it("Withdrawing too soon should revert", async () => {
			const block = await ethers.provider.getBlock("latest");
			if (!block) {
				throw new Error("Block is null. Aborting test");
			}

			await expect(insurancePool.connect(insurer1).executeWithdrawal()).to.be
			.revertedWithCustomError(
				insurancePool,
				"WithdrawalNotReady"
			);
		});

		it("Withdrawal request should be reset", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReqBeforeWithdraw = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReqBeforeWithdraw[0];

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			const withdrawReqAfterWithdraw = await insurancePool.withdrawalRequests(insurer1.address);

			expect(withdrawReqAfterWithdraw[0]).to.equal(0n);	// amount
			expect(withdrawReqAfterWithdraw[1]).to.equal(0n);	// unlockTimestamp
		});

		it("Withdrawing should burn LPToken", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			const lpTokenBalanceBeforeWithdrawal = await lpToken.balanceOf(insurer1.address);

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			const lpTokenBalanceAfterWithdrawal = await lpToken.balanceOf(insurer1.address);

			expect(lpTokenBalanceAfterWithdrawal).to.equal(lpTokenBalanceBeforeWithdrawal - withdrawAmount);
		});


		it("Withdrawing should give asset back", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			const assetBalanceBeforeWithdrawal = await asset.balanceOf(insurer1.address);
			// console.log(`assetBalanceBeforeWithdrawal: ${assetBalanceBeforeWithdrawal}`);

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			const assetBalanceAfterWithdrawal = await asset.balanceOf(insurer1.address);
			// console.log(`assetBalanceAfterWithdrawal: ${assetBalanceAfterWithdrawal}`);

			expect(assetBalanceAfterWithdrawal).to.be.greaterThan(assetBalanceBeforeWithdrawal);
		});

		it("Total liquidity should be updated after withdrawal", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			const totalLiquidityBeforeWithdrawal = await insurancePool.totalLiquidity();
			// console.log(`totalLiquidityBeforeWithdrawal: ${totalLiquidityBeforeWithdrawal}`);

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			const totalLiquidityAfterWithdrawal = await insurancePool.totalLiquidity();
			// console.log(`totalLiquidityAfterWithdrawal: ${totalLiquidityAfterWithdrawal}`);

			expect(totalLiquidityAfterWithdrawal).to.be.lessThan(totalLiquidityBeforeWithdrawal);
		});

		it("Free liquidity should be updated after withdrawal", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds
			const MAX_USE = 75n;

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			// const freeLiquidityBeforeWithdrawal = await insurancePool.freeLiquidity();
			// console.log(`freeLiquidityBeforeWithdrawal: ${freeLiquidityBeforeWithdrawal}`);

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			const totalLiquidityAfterWithdrawal = await insurancePool.totalLiquidity();
			const freeLiquidityAfterWithdrawal = await insurancePool.freeLiquidity();
			const totalLocked = await insurancePool.totalLocked();
			// console.log(`freeLiquidityAfterWithdrawal: ${freeLiquidityAfterWithdrawal}`);

			expect(freeLiquidityAfterWithdrawal).to.equal((MAX_USE * totalLiquidityAfterWithdrawal / 100n) - totalLocked);
		});

		it("Deposit timestamp should be reset", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			expect(await insurancePool.depositTimestamps(insurer1.address)).to.equal(0n);
		});

		it("Withdrawing should reward BEE", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			const BEEBalanceBeforeWithdrawal = await beesCoverToken.balanceOf(insurer1.address);
			// console.log(`BEEBalanceBeforeWithdrawal: ${BEEBalanceBeforeWithdrawal}`);

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			const BEEBalanceAfterWithdrawal = await beesCoverToken.balanceOf(insurer1.address);
			// console.log(`BEEBalanceAfterWithdrawal: ${BEEBalanceAfterWithdrawal}`);

			expect(BEEBalanceAfterWithdrawal).to.be.greaterThanOrEqual(BEEBalanceBeforeWithdrawal);
		});

		it("Withdrawing should emit event", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await expect(insurancePool.connect(insurer1).executeWithdrawal()).to
			.emit(
				insurancePool,
				"WithdrawalExecuted"
			);
		});
	});

	// ====================== executeWithdrawal [Extreme] ====================== //

	describe("executeWithdrawal() [Extreme]", () => {
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let insurer1: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(extremeRequestWithdrawalFixture);
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			insurer1 = fixture.insurer1;
		});

		it("Withdrawing when total locked is maxed should transfer funds from reserve", async () => {
			const balanceInsurancePoolBeforeWithdrawal = await asset.balanceOf(insurancePool.getAddress());

			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			const balanceInsurancePoolAfterWithdrawal = await asset.balanceOf(insurancePool.getAddress());

			expect(balanceInsurancePoolAfterWithdrawal).to.be.greaterThan(balanceInsurancePoolBeforeWithdrawal);
		});

		it("Withdrawing when total locked is maxed should set free liquidity to 0", async () => {
			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			expect(await insurancePool.freeLiquidity()).to.equal(0n);
		});

		it("Withdrawing when total locked is maxed should increase total borrowed from reserve", async () => {
			const totalFromReserveBeforeWithdrawal = await insurancePool.totalFromReserve();

			const lpTokenAddr = await insurancePool.lpToken();
			const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
			const WITHDRAWAL_DELAY = 60n;	// 1 minute in seconds

			await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
			await network.provider.send("evm_mine");

			const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
			const withdrawAmount = withdrawReq[0];	// amount

			await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

			await insurancePool.connect(insurer1).executeWithdrawal();

			expect(await insurancePool.totalFromReserve()).to.be.greaterThan(totalFromReserveBeforeWithdrawal);
		});
	});

	// ========================= buyCoverage [Normal] ========================= //

	describe("buyCoverage()", () => {
		let assetSwitch: Asset;
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let assetDecimals: number;
		let aavePool: IPool;
		let treasuryFund: Fund;
		beforeEach(async () => {
			const fixture = await loadFixture(provideLiquidityFixture);
			assetSwitch = fixture. assetSwitch;
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			assetDecimals = fixture.assetDecimals;
			aavePool = fixture.aavePool;
			treasuryFund = fixture.treasuryFund;
		});

		it("Zero cover amount should revert", async () => {
			const {user: insured} = await getOtherUser(assetSwitch);
			const coverAmount = 0n;
			const coverDuration = 30n;	// 30 days

			await expect(insurancePool.connect(insured).buyCoverage(coverAmount, coverDuration)).to.be
			.revertedWithCustomError(
				insurancePool,
				"InvalidCoverageAmount"
			);
		});

		it("Cover amount above free liquidity should revert", async () => {
			const {user: insured} = await getOtherUser(assetSwitch);
			const coverAmount = 1_000_000n * BigInt(10**assetDecimals);
			const coverDuration = 30n;	// 30 days

			await expect(insurancePool.connect(insured).buyCoverage(coverAmount, coverDuration)).to.be
			.revertedWithCustomError(
				insurancePool,
				"InvalidCoverageAmount"
			);
		});

		it("Buying a coverage shouuld increase the locked total", async () => {
			const {user: insured} = await getOtherUser(assetSwitch);
			const coverAmount = 1_000n * BigInt(10**assetDecimals);
			const coverDuration = 30n;	// 30 days

			const totalLockedBeforeBuyCoverage = await insurancePool.totalLocked();

			const premium = await insurancePool.connect(insured).computePremium(coverAmount, coverDuration);

			await asset.connect(insured).approve(insurancePool.getAddress(), premium);

			await insurancePool.connect(insured).buyCoverage(coverAmount, coverDuration);

			expect(await insurancePool.totalLocked()).to.equal(totalLockedBeforeBuyCoverage + coverAmount);
		});

		it("Insurance pool should receive aToken after coverage buy", async() => {
			const aTokenAddr = (await aavePool.getReserveData(asset.getAddress())).aTokenAddress;
			const aToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", aTokenAddr)) as unknown as IERC20;
			const aTokenBalanceBeforeDeposit = await aToken.balanceOf(insurancePool.getAddress());

			const {user: insured} = await getOtherUser(assetSwitch);
			const coverAmount = 1_000n * BigInt(10**assetDecimals);
			const coverDuration = 30n;	// 30 days

			const premium = await insurancePool.connect(insured).computePremium(coverAmount, coverDuration);

			await asset.connect(insured).approve(insurancePool.getAddress(), premium);

			await insurancePool.connect(insured).buyCoverage(coverAmount, coverDuration);

			expect(await aToken.balanceOf(insurancePool.getAddress())).to.be.greaterThan(aTokenBalanceBeforeDeposit);
		});

		it("Treasury fund should receive aToken after coverage buy", async() => {
			const aTokenAddr = (await aavePool.getReserveData(asset.getAddress())).aTokenAddress;
			const aToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", aTokenAddr)) as unknown as IERC20;
			const aTokenBalanceBeforeDeposit = await aToken.balanceOf(treasuryFund.getAddress());

			const {user: insured} = await getOtherUser(assetSwitch);
			const coverAmount = 1_000n * BigInt(10**assetDecimals);
			const coverDuration = 30n;	// 30 days

			const premium = await insurancePool.connect(insured).computePremium(coverAmount, coverDuration);

			await asset.connect(insured).approve(insurancePool.getAddress(), premium);

			await insurancePool.connect(insured).buyCoverage(coverAmount, coverDuration);

			expect(await aToken.balanceOf(treasuryFund.getAddress())).to.be.greaterThan(aTokenBalanceBeforeDeposit);
		});

		it("Buying coverage should emeit event", async () => {
			const {user: insured} = await getOtherUser(assetSwitch);
			const coverAmount = 1_000n * BigInt(10**assetDecimals);
			const coverDuration = 30n;	// 30 days

			const poolId = await insurancePool.poolId();

			const premium = await insurancePool.connect(insured).computePremium(coverAmount, coverDuration);

			await asset.connect(insured).approve(insurancePool.getAddress(), premium);

			await expect(insurancePool.connect(insured).buyCoverage(coverAmount, coverDuration)).to
			.emit(
				insurancePool,
				"CoveragePurchased"
			)
			.withArgs(
				poolId,
				insured.address,
				coverAmount,
				coverDuration,
				premium,
				0n
			);
		});
	});

	// ========================= createClaim [Normal] ========================= //

	describe("createClaim()", () => {
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let coverageProof: CoverageProof;
		let arbitrator: Arbitrator;
		let insured: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(buyCoverageFixture);
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			coverageProof = fixture.coverageProof;
			arbitrator = fixture.arbitrator;
			insured = fixture.insured;
		});

		it("Non holder should revert", async () => {
			const tokenId = 0n;
			const evidenceURI = "ipfs://link-to-evidence";

			await expect(insurancePool.createClaim(tokenId, evidenceURI)).to.be
			.revertedWithCustomError(
				insurancePool,
				"NotCoverHolder"
			);
		});

		it("Coverage should be active to create a claim", async () => {
			const tokenId = 0n;
			const evidenceURI = "ipfs://link-to-evidence";

			await coverageProof.setCoverageStatus(0n, CoverageStatus.Expired);

			await expect(insurancePool.connect(insured).createClaim(tokenId, evidenceURI)).to.be
			.revertedWithCustomError(
				insurancePool,
				"InvalidStatus"
			);
		});

		it("Claim should be registered", async () => {
			const tokenId = 0n;
			const evidenceURI = "ipfs://link-to-evidence";
			const poolId = await insurancePool.poolId();
			const coverageInfo = await coverageProof.coverageInfos(tokenId);
			const coverageValue = coverageInfo[0];

			const arbitrationCost = await arbitrator.arbitrationCost();

			await insurancePool.connect(insured).createClaim(tokenId, evidenceURI, {value: arbitrationCost});

			const claim = await insurancePool.claims(0n);
			expect(claim[0]).to.equal(insured.address);					// msg.sender
			expect(claim[1]).to.equal(tokenId);									// tokenId
			expect(claim[2]).to.equal(0n);											// disputeId
			expect(claim[3]).to.equal(poolId);									// poolId
			expect(claim[4]).to.equal(coverageValue);						// value
			expect(claim[5]).to.equal(0n);											// ruling
			expect(claim[6]).to.equal(evidenceURI);							// evidenceURI
			expect(claim[7]).to.equal(await asset.getAddress());	// asset
			expect(claim[8]).to.equal(false);										// ruled
		});

		it("Creating a claim should register the dispute and claim ids", async () => {
			const tokenId = 0n;
			const evidenceURI = "ipfs://link-to-evidence";

			const arbitrationCost = await arbitrator.arbitrationCost();

			await insurancePool.connect(insured).createClaim(tokenId, evidenceURI, {value: arbitrationCost});

			expect(await insurancePool.disputeToClaim(0n)).to.equal(0n);
		});

		it("Creating a claim should update coverage status", async() => {
			const tokenId = 0n;
			const evidenceURI = "ipfs://link-to-evidence";

			const arbitrationCost = await arbitrator.arbitrationCost();

			await insurancePool.connect(insured).createClaim(tokenId, evidenceURI, {value: arbitrationCost});

			const coverageInfo = await coverageProof.coverageInfos(tokenId);
			const coverageStatus = coverageInfo[4];

			expect(coverageStatus).to.equal(CoverageStatus.Claimed);
		});

		it("Creating a claim should emit two events", async () => {
			const tokenId = 0n;
			const evidenceURI = "ipfs://link-to-evidence";

			const arbitrationCost = await arbitrator.arbitrationCost();

			await expect(insurancePool.connect(insured).createClaim(tokenId, evidenceURI, {value: arbitrationCost})).to
			.emit(
				insurancePool,
				"Evidence"
			)
			.withArgs(
				arbitrator.getAddress(),
				insurancePool.disputeToClaim(0n),
				insured.address,
				evidenceURI
			)
			.emit(
				insurancePool,
				"Dispute"
			)
			.withArgs(
				arbitrator.getAddress(),
				0n,	// disputeId
				0n,	// META_EVIDENCE_ID
				insurancePool.disputeToClaim(0n),
			);
		});
	});

	// ============================ rule [Abstain] ============================ //

	describe("rule() [Abstain]", () => {
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let arbitrator: Arbitrator;
		let insured: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(ruleAbstainFixture);
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			arbitrator = fixture.arbitrator;
			insured = fixture.insured;
		});

		it("Only arbitrator should rule", async () => {
			const disputeId = 0n;
			const ruling = 1n;

			await expect(insurancePool.rule(disputeId, ruling)).to.be
			.revertedWithCustomError(
				insurancePool,
				"NotArbitrator"
			);
		});

		it("Ruling should set the claim as ruled", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			await arbitrator.executeRuling(disputeId);

			const claim = await insurancePool.claims(disputeId);
			const ruled = claim[8];

			expect(ruled).to.equal(true);
		});

		it("Ruling should register the ruling", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			await arbitrator.executeRuling(disputeId);

			const claim = await insurancePool.claims(disputeId);
			const ruling = claim[5];

			expect(ruling).to.equal(0n);	// Abstain
		});

		it("Ruling 'Abstain' shouldn't pay out", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			const balanceInsuredBeforeRuling = await asset.balanceOf(insured.address);

			await arbitrator.executeRuling(disputeId);

			expect(await asset.balanceOf(insured.address)).to.equal(balanceInsuredBeforeRuling);
		});

		it("Ruling should emit event", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			await expect(arbitrator.executeRuling(disputeId)).to
			.emit(
				insurancePool,
				"Ruling"
			)
			.withArgs(
				arbitrator.getAddress(),
				disputeId,
				0n		// Abstain
			);
		});
	});

	// ========================== rule [Yes][Normal] ========================== //

	describe("rule() [Yes][Normal]", () => {
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let coverageProof: CoverageProof;
		let arbitrator: Arbitrator;
		let insured: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(ruleYesFixture);
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			coverageProof = fixture.coverageProof;
			arbitrator = fixture.arbitrator;
			insured = fixture.insured;
		});

		it("Total locked should decrease", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			const totalLockedBeforeRuling = await insurancePool.totalLocked();
			const claim = await insurancePool.claims(disputeId);
			const claimValue = claim[4];

			await arbitrator.executeRuling(disputeId);

			expect(await insurancePool.totalLocked()).to.equal(totalLockedBeforeRuling - claimValue);
		});

		it("Total liquidity should decrease", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			const totalLiquidityBeforeRuling = await insurancePool.totalLiquidity();
			const claim = await insurancePool.claims(disputeId);
			const claimValue = claim[4];

			await arbitrator.executeRuling(disputeId);

			expect(await insurancePool.totalLiquidity()).to.equal(totalLiquidityBeforeRuling - claimValue);
		});

		it("Free liquidity should decrease", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second
			const MAX_USE = 75n;

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			await arbitrator.executeRuling(disputeId);

			const totalLocked = await insurancePool.totalLocked();
			const totalLiquidity = await insurancePool.totalLiquidity();

			expect(await insurancePool.freeLiquidity()).to.equal((MAX_USE * totalLiquidity / 100n) - totalLocked);
		});

		it("Insured should receive pay out", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			const balanceBeforeRuling = await asset.balanceOf(insured.address);
			const claim = await insurancePool.claims(disputeId);
			const claimValue = claim[4];

			await arbitrator.executeRuling(disputeId);

			expect(await asset.balanceOf(insured)).to.equal(balanceBeforeRuling + claimValue);
		});

		it("Coverage status should be updated", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			const claim = await insurancePool.claims(disputeId);
			const tokenId = claim[1];

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			await arbitrator.executeRuling(disputeId);

			const coverageInfo = await coverageProof.getCoverageInfos(tokenId);
			const status = coverageInfo[4];

			expect(status).to.equal(CoverageStatus.PaidOut);
		});
	});

	// ========================== rule [Yes][Extreme] ========================== //
	/*
	describe("rule() [Yes][Extreme]", () => {
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let aavePool: IPool;
		let coverageProof: CoverageProof;
		let arbitrator: Arbitrator;
		let insured: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(extremeRuleYesFixture);
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			aavePool: fixture.aavePool;
			coverageProof = fixture.coverageProof;
			arbitrator = fixture.arbitrator;
			insured = fixture.insured;
		});

		it("Total borrowed from reserve should decrease", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			const totalLiquidityBeforeRuling = await insurancePool.totalLiquidity();
			const totalFromReserveBeforeRuling = await insurancePool.totalFromReserve();
			const claim = await insurancePool.claims(disputeId);
			const claimValue = claim[4];
			console.log(`claimValue: ${claimValue}`);
			console.log(`totalLiquidityBeforeRuling: ${totalLiquidityBeforeRuling}`);
			console.log(`totalFromReserveBeforeRuling: ${totalFromReserveBeforeRuling}`);
			console.log(`totalLocked: ${await insurancePool.totalLocked()}`);

			const aTokenAddr = (await aavePool.getReserveData(asset.getAddress())).aTokenAddress;
			const aToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", aTokenAddr)) as unknown as IERC20;

			const aTokenBalanceInsuracePoolBeforeRuling = await aToken.balanceOf(insurancePool.getAddress());
			console.log(`aTokenBalanceInsuracePoolBeforeRuling: ${aTokenBalanceInsuracePoolBeforeRuling}`);



			await arbitrator.executeRuling(disputeId);

			expect(await insurancePool.totalFromReserve()).to.equal(totalFromReserveBeforeRuling - (claimValue - totalLiquidityBeforeRuling));
		});
	});
	*/

	// =============================== rule [No] =============================== //

	describe("rule() [No]", () => {
		let insurancePool: InsurancePool;
		let asset: IERC20;
		let arbitrator: Arbitrator;
		let insured: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(ruleNoFixture);
			insurancePool = fixture.insurancePool;
			asset = fixture.asset;
			arbitrator = fixture.arbitrator;
			insured = fixture.insured;
		});

		it("Ruling 'No' shouldn't pay out", async () => {
			const disputeId = 0n;
			const APPEAL_DELAY = 60n * 60n * 24n;	// 1 day in second

			await network.provider.send("evm_increaseTime", [Number(APPEAL_DELAY)]);
			await network.provider.send("evm_mine");

			const balanceInsuredBeforeRuling = await asset.balanceOf(insured.address);

			await arbitrator.executeRuling(disputeId);

			expect(await asset.balanceOf(insured.address)).to.equal(balanceInsuredBeforeRuling);
		});
	});
})