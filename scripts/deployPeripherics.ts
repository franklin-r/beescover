import { ethers } from "hardhat";
import { FundType } from "../test/utils/enums";
import { deployWhitelists } from "./deployWhitelists";
import { deployFund } from "./deployFund";
import { deployBeesCoverToken } from "./deployBeesCoverToken";
import { deployCoverageProof } from "./deployCoverageProof";
import { deployTimelockController } from "./deployTimelockController";
import { deployBeesCoverGovernor } from "./deployBeesCoverGovernor";
// import { deployArbitrator } from "./deployArbitrator";

export async function deployPeripherics(_admin: string): Promise<{
	whitelists: string,
	treasuryFund: string,
	reserveFund: string,
	beesCoverToken: string,
	coverageProof: string,
	timelockController: string,
	beesCoverGovernor: string,
	// Needs to be deployed through Kleros' centralized arbitrator dashboard
	// arbitrator: string
}> {

	console.log("=== Deploying BeesCover Protocol's Peripheric Contracts ===");

	const admin = await ethers.getImpersonatedSigner(_admin);
	const minDelay = BigInt(60 * 3);	// 3 minutes
	const proposers: string[] = [];
	const executors: string[] = ["0x0000000000000000000000000000000000000000"];

	const whitelists = await deployWhitelists(admin.address);
	const treasuryFund = await deployFund(admin.address, FundType.Treasury, whitelists);
	const reserveFund = await deployFund(admin.address, FundType.Reserve, whitelists);
	const beesCoverToken = await deployBeesCoverToken(admin.address, treasuryFund);
	const coverageProof = await deployCoverageProof(admin.address);
	const timelockController = await deployTimelockController(minDelay, proposers, executors, admin.address);
	const beesCoverGovernor = await deployBeesCoverGovernor(beesCoverToken, timelockController);
	// const arbitrator = await deployArbitrator();
	const arbitrator = "0x9555a5423b4004d8ced8b9751484d9975a86aee3";

	console.log("Deployment summary:");
	console.log(`Whitelists:\t${whitelists}`);
	console.log(`ReserveFund:\t${reserveFund}`);
	console.log(`TreasuryFund:\t${treasuryFund}`);
	console.log(`BeesCoverToken:\t${beesCoverToken}`);
	console.log(`CoverageProof:\t${coverageProof}`);
	console.log(`TimelockController:\t${timelockController}`);
	console.log(`BeesCoverGovernor:\t${beesCoverGovernor}`);
	console.log(`Arbitrator:\t${arbitrator}`);

	return {whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, timelockController, beesCoverGovernor/*, arbitrator*/};
}

if (require.main === module) {
	(async () => {
		const [deployer] = await ethers.getSigners();

		await deployPeripherics(deployer.address);
	})();
}