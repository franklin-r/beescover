import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CoverageProof } from "../../typechain-types";
import { deployCoverageProofFixture, mintNFTFixture } from "../utils/fixtures";
import { CoverageStatus } from "../utils/enums";

describe("CoverageProof Tests", () => {

	// ============================== DEPLOYMENT ============================== //

	describe("constructor()", () => {
		let coverageProof: CoverageProof;
		let admin: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(deployCoverageProofFixture);
			coverageProof = fixture.coverageProof;
			admin = fixture.admin;
		});

		it("Admin should have minter role", async () => {
			const COVERAGE_PROOF_ADMIN_ROLE = await coverageProof.COVERAGE_PROOF_ADMIN_ROLE();
			expect(await coverageProof.hasRole(COVERAGE_PROOF_ADMIN_ROLE, admin.address)).to.equal(true);
		});
	});

	// =============================== safeMint =============================== //

	describe("safeMint()", () => {
		let coverageProof: CoverageProof;
		let admin: SignerWithAddress;
		let addr1: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(deployCoverageProofFixture);
			coverageProof = fixture.coverageProof;
			admin = fixture.admin;
		});

		it("Non admin should revert", async () => {
			const [, recipient] = await ethers.getSigners();
			const COVERAGE_PROOF_ADMIN_ROLE = await coverageProof.COVERAGE_PROOF_ADMIN_ROLE();
			await expect(coverageProof.connect(recipient).safeMint(recipient.address, 100n, 1000000n, 1n)).to.be
			.revertedWithCustomError(
				coverageProof,
				"AccessControlUnauthorizedAccount"
			)
			.withArgs(
				recipient,
				COVERAGE_PROOF_ADMIN_ROLE
			);
		});

		it("Minter should not revert", async () => {
			const [, recipient] = await ethers.getSigners();
			await expect(coverageProof.connect(admin).safeMint(recipient.address, 100n, 1000000n, 1n)).to.not.be.reverted;
		});

		it("Coverage proof minting should emit event", async () => {
			const value = 100n;
			const duration = 1000000n;
			const poolId = 1n;
			const block = await ethers.provider.getBlock("latest");
			const [, recipient] = await ethers.getSigners();

			if (!block) {
				throw new Error("Block is null. Aborting test");
			}

			// +1 to account for delay
			const currentTimestamp = BigInt(block.timestamp) + 1n;

			// May fail because of endTimestamp when executed on forked network due to delay.
			await expect(coverageProof.connect(admin).safeMint(recipient.address, value, duration, poolId)).to
			.emit(
				coverageProof,
				"CoverageProofMinted"
			)
			.withArgs(
				recipient.address,
				value,
				currentTimestamp,
				currentTimestamp + duration,
				0n,
				poolId
			);
		});

		it("Coverage proof minting should register correct infos", async () => {
			const value = 100n;
			const duration = 1000000n;
			const poolId = 1n;
			const block = await ethers.provider.getBlock("latest");
			const [, recipient] = await ethers.getSigners();

			if (!block) {
				throw new Error("Block is null. Aborting test");
			}

			// +1 to account for delay
			const currentTimestamp = BigInt(block.timestamp) + 1n;

			await coverageProof.connect(admin).safeMint(recipient.address, value, duration, poolId);

			const coverageInfo = await coverageProof.coverageInfos(0n);
			expect(coverageInfo[0]).to.equal(value);												// Covered value
			expect(coverageInfo[1]).to.equal(currentTimestamp);							// Start timestamp
			// May fail when executed on forked network due to delay.
			expect(coverageInfo[2]).to.equal(currentTimestamp + duration);	// End timestamp
			expect(coverageInfo[3]).to.equal(poolId);												// Pool ID
			expect(coverageInfo[4]).to.equal(CoverageStatus.Active);				// Status
			expect(coverageInfo[5]).to.equal(recipient.address);						// Insured
		});
	});

	// =============================== setValue =============================== //

	describe("setValue()", () => {
		let coverageProof: CoverageProof;
		let admin: SignerWithAddress;
		let recipient: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(mintNFTFixture);
			coverageProof = fixture.coverageProof;
			admin = fixture.admin;
			recipient = fixture.recipient;
		});

		it("Updating covered value should save correct value", async () => {
			const newValue = 50n;

			await coverageProof.connect(admin).setValue(0n, newValue);
			const coverageInfo = await coverageProof.coverageInfos(0n);
			expect(coverageInfo[0]).to.equal(newValue);
		});

		it("Updating covered value should emit event", async () => {
			const newValue = 50n;
			const coverageInfo = await coverageProof.coverageInfos(0n);
			const oldValue = coverageInfo[0];

			await expect(coverageProof.connect(admin).setValue(0n, newValue)).to
			.emit(
				coverageProof,
				"CoveredValueUpdated"
			)
			.withArgs(
				0n,
				oldValue,
				newValue
			);
		});

		it("Updating covered value to 0 should set it as claimed", async () => {
			await coverageProof.connect(admin).setValue(0n, 0n);
			const coverageInfo = await coverageProof.coverageInfos(0n);
			expect(coverageInfo[3]).to.equal(1n);	// 1n == Claimed
		});

		it("Updating value to 0 should emit two events", async () => {
			const coverageInfo = await coverageProof.coverageInfos(0n);

			await expect(coverageProof.connect(admin).setValue(0n, 0n))
			.to.emit(
				coverageProof,
				"CoveredValueUpdated"
			)
			.withArgs(
				0n,
				coverageInfo[0],
				0n
			)
			.to.emit(
				coverageProof,
				"CoverageStatusUpdated"
			)
			.withArgs(
				0n,
				coverageInfo[4],
				1n
			);
		});
	});

	// =========================== setCoverageStatus =========================== //

	describe("setCoverageStatus()", () => {
		let coverageProof: CoverageProof;
		let admin: SignerWithAddress;
		let recipient: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(mintNFTFixture);
			coverageProof = fixture.coverageProof;
			admin = fixture.admin;
			recipient = fixture.recipient;
		});

		it("Updating coverage status should save correct value", async () => {
			const newStatus = CoverageStatus.Claimed;

			await coverageProof.connect(admin).setCoverageStatus(0n, newStatus);
			const coverageInfo = await coverageProof.coverageInfos(0n);
			expect(coverageInfo[4]).to.equal(newStatus);
		});

		it("Updating coverage status should emit event", async () => {
			const newStatus = CoverageStatus.Claimed;
			const coverageInfo = await coverageProof.coverageInfos(0n);
			const oldStatus = coverageInfo[4];

			await expect(coverageProof.connect(admin).setCoverageStatus(0n, newStatus)).to
			.emit(
				coverageProof,
				"CoverageStatusUpdated"
			)
			.withArgs(
				0n,
				oldStatus,
				newStatus
			);
		});

		it("Updating coverage status from Expired to something else should revert", async () => {
			await coverageProof.connect(admin).setCoverageStatus(0n, CoverageStatus.Expired);

			await expect(coverageProof.connect(admin).setCoverageStatus(0n, CoverageStatus.Active)).to.be
			.revertedWithCustomError(
				coverageProof,
				"CoverageAlreadyExpired"
			)
			.withArgs(
				0n
			);
		});
	});

	// ============================ extendDuration ============================ //

	describe("extendDuration()", () => {
		let coverageProof: CoverageProof;
		let admin: SignerWithAddress;
		let recipient: SignerWithAddress;
		beforeEach(async () => {
			const fixture = await loadFixture(mintNFTFixture);
			coverageProof = fixture.coverageProof;
			admin = fixture.admin;
			recipient = fixture.recipient;
		});

		it("Zero duration extension should revert", async () => {
			await expect(coverageProof.extendDuration(0n, 0n)).to.be
			.revertedWithCustomError(
				coverageProof,
				"ZeroDurationNotAllowed"
			);
		});

		it("Extending coverage duration should save correct info", async () => {
			const extension = 100000n;
			const oldCoverageInfo = await coverageProof.coverageInfos(0n);
			const oldEndTimestamp = oldCoverageInfo[2];

			await coverageProof.extendDuration(0n, extension);

			const newCoverageInfo = await coverageProof.coverageInfos(0n);
			const newEndTimestamp = newCoverageInfo[2];

			expect(newEndTimestamp).to.equal(oldEndTimestamp + extension);
		});

		it("Extending coverage should emit event", async () => {
			const extension = 100000n;
			const oldCoverageInfo = await coverageProof.coverageInfos(0n);
			const oldEndTimestamp = oldCoverageInfo[2];

			await expect(coverageProof.extendDuration(0n, extension)).to
			.emit(
				coverageProof,
				"CoverageDurationExtended"
			)
			.withArgs(
				0n,
				oldEndTimestamp,
				oldEndTimestamp + extension
			);
		});
	});
})