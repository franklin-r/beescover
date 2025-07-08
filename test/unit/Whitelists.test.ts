import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Whitelists } from "../../typechain-types";
import { WhitelistType } from "../utils/enums";
import { deployWhitelistsFixture, whitelistsAddFixture } from "../utils/fixtures";

describe("Whitelists Tests", () => {

	// ========================== add ========================== //

	describe("add()", () => {
		let whitelists: Whitelists;
		let admin: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(deployWhitelistsFixture);
			whitelists = fixture.whitelists;
			admin = fixture.admin;
		});

		it("Non admin should revert", async () => {
			const WHITELISTS_ADMIN_ROLE = await whitelists.WHITELISTS_ADMIN_ROLE();
			const [, randomAddr] = await ethers.getSigners();
			const assets = [ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address];
			const reserveTargets = [ethers.Wallet.createRandom().address];
			const treasureyTargets = [ethers.Wallet.createRandom().address];

			await expect(whitelists.connect(randomAddr).add(assets, reserveTargets, treasureyTargets)).to.be
			.revertedWithCustomError(
				whitelists,
				"AccessControlUnauthorizedAccount"
			)
			.withArgs(
				randomAddr,
				WHITELISTS_ADMIN_ROLE
			);
		});

		it("Adding zero address should revert", async () => {
			await expect(whitelists.connect(admin).add(["0x0000000000000000000000000000000000000000"], [], [])).to.be
			.revertedWithCustomError(
				whitelists,
				"ZeroAddressNotAllowed"
			);
		});

		it("Adding addresses should emit events", async () => {
			const assets = [ethers.Wallet.createRandom().address];
			const reserveTargets = [ethers.Wallet.createRandom().address];
			const treasureyTargets = [ethers.Wallet.createRandom().address];

			await expect(whitelists.connect(admin).add(assets, reserveTargets, treasureyTargets)).to
			.emit(whitelists, "AddressAdded").withArgs(assets[0],WhitelistType.Asset)
			.emit(whitelists, "AddressAdded").withArgs(reserveTargets[0],WhitelistType.Reserve)
			.emit(whitelists, "AddressAdded").withArgs(treasureyTargets[0],WhitelistType.Treasury);
		});

		it("Adding already whitelisted address should revert", async () => {
			const assets = [ethers.Wallet.createRandom().address];

			await whitelists.connect(admin).add(assets, [], []);
			await expect(whitelists.connect(admin).add(assets, [], [])).to.be
			.revertedWithCustomError(
				whitelists,
				"AddressAlreadyWhitelisted"
			)
			.withArgs(
				assets[0],
				WhitelistType.Asset
			);
		});
	});

	// ============================= remove ============================= //

	describe("remove()", () => {
		let whitelists: Whitelists;
		let admin: SignerWithAddress;
		let assets: string[];
		let reserveTargets: string[];
		let treasuryTargets: string[];
		beforeEach(async () => {
			const fixture = await loadFixture(whitelistsAddFixture);
			whitelists = fixture.whitelists;
			admin = fixture.admin;
			assets = fixture.assets;
			reserveTargets = fixture.reserveTargets;
			treasuryTargets = fixture.treasuryTargets;
		});

		it("Non admin should revert", async () => {
			const WHITELISTS_ADMIN_ROLE = await whitelists.WHITELISTS_ADMIN_ROLE();
			const [, randomAddr] = await ethers.getSigners();
			const assetsToRemove = [ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address];
			const reserveTargetsToRemove = [ethers.Wallet.createRandom().address];
			const treasureyTargetsToRemove = [ethers.Wallet.createRandom().address];

			await expect(whitelists.connect(randomAddr).remove(assetsToRemove, reserveTargetsToRemove, treasureyTargetsToRemove)).to.be
			.revertedWithCustomError(
				whitelists,
				"AccessControlUnauthorizedAccount"
			)
			.withArgs(
				randomAddr,
				WHITELISTS_ADMIN_ROLE
			);
		});

		it("Removing addresses should emit events", async () => {

			await expect(whitelists.connect(admin).remove(assets, reserveTargets, treasuryTargets)).to
			.emit(whitelists, "AddressRemoved").withArgs(assets[0],WhitelistType.Asset)
			.emit(whitelists, "AddressRemoved").withArgs(reserveTargets[0],WhitelistType.Reserve)
			.emit(whitelists, "AddressRemoved").withArgs(treasuryTargets[0],WhitelistType.Treasury);
		});

		it("Removing already not allowed address should revert", async () => {
			const assetsToRemove = [ethers.Wallet.createRandom().address];

			await expect(whitelists.connect(admin).remove(assetsToRemove, [], [])).to.be
			.revertedWithCustomError(
				whitelists,
				"AddressAlreadyNotAllowed"
			)
			.withArgs(
				assetsToRemove[0],
				WhitelistType.Asset
			);
		});
	});

	// ============================= isAddressWhitelisted ============================= //

	describe("isAddressWhitelisted()", () => {
		let whitelists: Whitelists;
		let admin: SignerWithAddress;
		let assets: string[];
		let reserveTargets: string[];
		let treasuryTargets: string[];
		beforeEach(async () => {
			const fixture = await loadFixture(whitelistsAddFixture);
			whitelists = fixture.whitelists;
			admin = fixture.admin;
			assets = fixture.assets;
			reserveTargets = fixture.reserveTargets;
			treasuryTargets = fixture.treasuryTargets;
		});

		it("Added address should be whitelisted", async () => {
			expect(await whitelists.connect(admin).isAddressWhitelisted(assets[0], WhitelistType.Asset)).to.equal(true);
		});

		it("Requesting address of unknown type should revert", async () => {
			await expect(whitelists.connect(admin).isAddressWhitelisted(assets[0], 3)).to.be
			.reverted;
		});
	});
})