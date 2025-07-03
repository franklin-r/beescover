import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BeesCoverToken } from "../../typechain-types";
import { deployBeesCoverTokenFixture } from "../utils/fixtures";

describe("BeesCoverToken Tests", () => {

	// ============================== DEPLOYMENT ============================== //

	describe("constructor()", () => {
		let beesCoverToken: BeesCoverToken;
		let deployer: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(deployBeesCoverTokenFixture);
			beesCoverToken = fixture.beesCoverToken;
			deployer = fixture.deployer;
		});

		it("Deployer should have minter role", async () => {
			const MINTER_ROLE = await beesCoverToken.MINTER_ROLE();
			expect(await beesCoverToken.hasRole(MINTER_ROLE, deployer.address)).to.equal(true);
		});
	});

	// ================================= mint ================================= //

	describe("mint()", () => {
		let beesCoverToken: BeesCoverToken;
		let minter: SignerWithAddress;
		let recipient: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(deployBeesCoverTokenFixture);
			beesCoverToken = fixture.beesCoverToken;
			minter = fixture.deployer;
			recipient = fixture.recipient;
		});

		it("Non minter should revert", async () => {
			const MINTER_ROLE = await beesCoverToken.MINTER_ROLE();
			const randomAddr = ethers.Wallet.createRandom().connect(ethers.provider);
			await expect(beesCoverToken.connect(randomAddr).mint(recipient.address, 100n)).to.be
			.revertedWithCustomError(
				beesCoverToken,
				"AccessControlUnauthorizedAccount"
			)
			.withArgs(
				randomAddr,
				MINTER_ROLE
			);
		});

		it("Minter should not revert", async () => {
			await expect(beesCoverToken.connect(minter).mint(recipient.address, 100n)).to.not.be.reverted;
		});
	});
})