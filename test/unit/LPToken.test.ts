import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { LPToken } from "../../typechain-types";
import { deployLPTokenFixture } from "../utils/fixtures";

describe("LPToken Tests", () => {

	// ============================== DEPLOYMENT ============================== //

	describe("constructor()", () => {
		let lpToken: LPToken;
		beforeEach(async () => {
			const fixture = await loadFixture(deployLPTokenFixture);
			lpToken = fixture.lpToken;
		});

		it("Minter should have according role", async () => {
			const MINTER_ROLE = await lpToken.MINTER_ROLE();
			const [minter] = await ethers.getSigners();
			expect(await lpToken.hasRole(MINTER_ROLE, minter.address)).to.equal(true);
		});
	});

	// ================================= mint ================================= //

	describe("mint()", () => {
		let lpToken: LPToken;
		beforeEach(async () => {
			const fixture = await loadFixture(deployLPTokenFixture);
			lpToken = fixture.lpToken;
		});

		it("Non minter should revert", async () => {
			const [, randomAddr] = await ethers.getSigners();
			const MINTER_ROLE = await lpToken.MINTER_ROLE();
			await expect(lpToken.connect(randomAddr).mint(randomAddr.address, 100n)).to.be
			.revertedWithCustomError(
				lpToken,
				"AccessControlUnauthorizedAccount"
			)
			.withArgs(
				randomAddr,
				MINTER_ROLE
			);
		});

		it("Minter should not revert", async () => {
			const [minter, randomAddr] = await ethers.getSigners();
			await expect(lpToken.connect(minter).mint(randomAddr.address, 100n)).to.not.be.reverted;
		})
	});

	// =============================== transfer =============================== //

	describe("transfer()", () => {
		let lpToken: LPToken;
		beforeEach(async () => {
			const fixture = await loadFixture(deployLPTokenFixture);
			lpToken = fixture.lpToken;
		});

		it("Trying to transfer the token should revert", async () => {
			const [minter, recipient] = await ethers.getSigners();

			await expect(lpToken.connect(minter).transfer(recipient.address, 10n)).to.be
			.revertedWithCustomError(
				lpToken,
				"NonTransferableToken"
			);
		});
	});

	// ============================= transferFrom ============================= //

	describe("transferFrom()", () => {
		let lpToken: LPToken;
		beforeEach(async () => {
			const fixture = await loadFixture(deployLPTokenFixture);
			lpToken = fixture.lpToken;
		});

		it("Trying to transferFrom the token should revert", async () => {
			const [minter, recipient] = await ethers.getSigners();

			await lpToken.connect(minter).approve(recipient, 10n);

			await expect(lpToken.connect(recipient).transferFrom(minter.address, recipient.address, 10n)).to.be
			.revertedWithCustomError(
				lpToken,
				"NonTransferableToken"
			);
		});
	});
})