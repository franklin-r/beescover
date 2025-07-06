import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Fund, MockUSDC } from "../../typechain-types";
import { FundType } from "../utils/enums";
import { deployFundFixture } from "../utils/fixtures";

describe("Fund Tests", () => {

	// ============================== DEPLOYMENT ============================== //

	describe("constructor()", () => {
		let fund: Fund;
		let admin: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(deployFundFixture);
			fund = fixture.fund;
			admin = fixture.fundAdmin;
		});

		it("Fund admin should have according role", async () => {
			const FUND_ADMIN_ROLE = await fund.FUND_ADMIN_ROLE();
			expect(await fund.hasRole(FUND_ADMIN_ROLE, admin.address)).to.equal(true);
		});

		it("Fund type should be set accordingly", async () => {
			expect(await fund.fundType()).to.equal(FundType.Reserve);
		});
	});

	// ============================= transferFund ============================= //

	describe("transferFund()", () => {
		let fund: Fund;
		let admin: SignerWithAddress;
		let assets: string[];
		let reserveTargets: string[];
		let mockUSDC: MockUSDC;
		beforeEach(async () => {
			const fixture = await loadFixture(deployFundFixture);
			fund = fixture.fund;
			admin = fixture.fundAdmin;
			assets = fixture.assets;
			reserveTargets = fixture.reserveTargets;
			mockUSDC = fixture.mockUSDC;
		});

		it("Non admin should revert", async () => {
			const [, randomAddr] = await ethers.getSigners();
			const FUND_ADMIN_ROLE = await fund.FUND_ADMIN_ROLE();
			await expect(fund.connect(randomAddr).transferFund(reserveTargets[0], assets[0], 100n, 100n)).to.be
			.revertedWithCustomError(
				fund,
				"AccessControlUnauthorizedAccount"
			)
			.withArgs(
				randomAddr,
				FUND_ADMIN_ROLE
			);
		});

		it("Target should be whitelisted first", async () => {
			const nonWhitelistedTarget = ethers.Wallet.createRandom().address;
			await expect(fund.connect(admin).transferFund(nonWhitelistedTarget, assets[0], 100n, 100n)).to.be
			.revertedWithCustomError(
				fund,
				"TargetNotWhitelisted"
			)
			.withArgs(
				nonWhitelistedTarget
			);
		});

		it("Asset should be whitelisted first", async () => {
			const nonWhitelistedAsset = ethers.Wallet.createRandom().address;
			await expect(fund.connect(admin).transferFund(reserveTargets[0], nonWhitelistedAsset, 100n, 100n)).to.be
			.revertedWithCustomError(
				fund,
				"AssetNotWhitelisted"
			)
			.withArgs(
				nonWhitelistedAsset
			);
		});

		it("Transfering ETH fund should emit event", async () => {
			const valueETH = 100n;
			const valueERC20 = 0n;

			await admin.sendTransaction({
				to: fund.getAddress(),
				value: 1000n
			});

			await expect(fund.connect(admin).transferFund(reserveTargets[0], assets[0], valueETH, valueERC20)).to
			.emit(
				fund,
				"ETHTransferedFund"
			)
			.withArgs(
				reserveTargets[0],
				valueETH
			);
		});

		it("Transfering ERC20 tokens fund should emit event", async () => {
			const valueETH = 0n;
			const valueERC20 = 100n;
			
			await mockUSDC.mint(fund.getAddress(), 1000n);
			await expect(fund.connect(admin).transferFund(reserveTargets[0], assets[0], valueETH, valueERC20)).to
			.emit(
				fund,
				"ERC20TransferedFund"
			)
			.withArgs(
				reserveTargets[0],
				assets[0],
				valueERC20
			);
		});

		it("Transfering ETH and ERC20 tokens fund should emit two events", async () => {
			const valueETH = 100n;
			const valueERC20 = 100n;

			await mockUSDC.mint(fund.getAddress(), 1000n);
			await admin.sendTransaction({
				to: fund.getAddress(),
				value: 1000n
			});

			await expect(fund.connect(admin).transferFund(reserveTargets[0], assets[0], valueETH, valueERC20))
			.to.emit(
				fund,
				"ETHTransferedFund"
			)
			.withArgs(
				reserveTargets[0],
				valueETH
			)
			.to.emit(
				fund,
				"ERC20TransferedFund"
			)
			.withArgs(
				reserveTargets[0],
				assets[0],
				valueERC20
			);
		});

		it("Failed ETH transfer should revert", async () => {
			const valueETH = 100n;
			const valueERC20 = 0n;
			await expect(fund.connect(admin).transferFund(reserveTargets[0], assets[0], valueETH, valueERC20)).to.be
			.revertedWithCustomError(
				fund,
				"ETHTransferFundFailed"
			)
			.withArgs(
				reserveTargets[0],
				valueETH
			);
		});

		it("Failed ERC20 tokens transfer should revert", async () => {
			const valueETH = 0n;
			const valueERC20 = 100n;
			await expect(fund.connect(admin).transferFund(reserveTargets[0], assets[0], valueETH, valueERC20)).to.be
			.revertedWithCustomError(
				mockUSDC,
				"ERC20InsufficientBalance"
			)
			.withArgs(
				fund.getAddress(),
				await mockUSDC.balanceOf(fund.getAddress()),
				valueERC20
			);
		});

		it("Empty values should not emit events", async () => {
			const valueETH = 0n;
			const valueERC20 = 0n;

			await mockUSDC.mint(fund.getAddress(), 1000n);
			await admin.sendTransaction({
				to: fund.getAddress(),
				value: 1000n
			});

			const tx = await fund.connect(admin).transferFund(reserveTargets[0], assets[0], valueETH, valueERC20);
			const receipt = await tx.wait();
			const erc20Topic = ethers.id("ERC20TransferedFund(address,address,uint256)");
			const ethTopic = ethers.id("ETHTransferedFund(address,uint256)");
			const logs = receipt?.logs.filter(log => {
				(log.topics[0] === erc20Topic) || (log.topics[0] === ethTopic)
			});

			expect(logs?.length).to.equal(0);
		});

		it("Empty values should not revert", async () => {
			const valueETH = 0n;
			const valueERC20 = 0n;

			await mockUSDC.mint(fund.getAddress(), 1000n);
			await admin.sendTransaction({
				to: fund.getAddress(),
				value: 1000n
			});

			await expect(fund.connect(admin).transferFund(reserveTargets[0], assets[0], valueETH, valueERC20)).to.not.be.reverted;
		});
	});
})