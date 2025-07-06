import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BeesCoverGovernor, MockUSDC, TimelockController, BeesCoverToken } from "../../typechain-types";
import { governorSetUpFixture } from "../utils/fixtures";

describe("BeesCoverGovernor Tests", () => {

	// ========================== propose ========================== //

	describe("propose()", () => {
		let beesCoverGovernor: BeesCoverGovernor;
		let admin: SignerWithAddress;
		let mockUSDC: MockUSDC;
		let timelockController: TimelockController;
		let beesCoverToken: BeesCoverToken;
		beforeEach(async () => {
			const fixture = await loadFixture(governorSetUpFixture);
			beesCoverGovernor = fixture.beesCoverGovernor;
			admin = fixture.admin;
			mockUSDC = fixture.mockUSDC;
			timelockController = fixture.timelockController;
			beesCoverToken = fixture.beesCoverToken;
		});

		it("Making proposal should emit event", async () => {
			const mockUSDCAddr = await mockUSDC.getAddress();
			const [, addr1] = await ethers.getSigners();
			const grantAmount = 1000n;
			const transferCalldata = mockUSDC.interface.encodeFunctionData("transfer", [addr1.address, grantAmount]);

			await expect(beesCoverGovernor.connect(admin).propose(
				[mockUSDCAddr],
				[0],
				[transferCalldata],
				"Proposal #1: Send MUSDC to addr1"
			)).to
			.emit(
				beesCoverGovernor,
				"ProposalCreated"
			);
		});
	});
})