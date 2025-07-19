import { ethers } from "hardhat";
import { FundType } from "../test/utils/enums";
import { deployWhitelists } from "./deployWhitelists";
import { deployFund } from "./deployFund";
import { deployBeesCoverToken } from "./deployBeesCoverToken";
import { deployCoverageProof } from "./deployCoverageProof";
import { deployTimelockController } from "./deployTimelockController";
import { deployBeesCoverGovernor } from "./deployBeesCoverGovernor";
// import { deployArbitrator } from "./deployArbitrator";
import {
	adminAddresses,
	deploymentConfig,
	getDeploymentKey
} from "./utils/deploymentConfig";

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

	const minDelay = BigInt(60 * 3);	// 3 minutes
	const proposers: string[] = [];

	const whitelists = await deployWhitelists(_admin);
	const treasuryFund = await deployFund(_admin, FundType.Treasury, whitelists);
	const reserveFund = await deployFund(_admin, FundType.Reserve, whitelists);
	const beesCoverToken = await deployBeesCoverToken(_admin, treasuryFund);
	const coverageProof = await deployCoverageProof(_admin);
	const timelockController = await deployTimelockController(minDelay, proposers, ["0x0000000000000000000000000000000000000000"], _admin);
	const beesCoverGovernor = await deployBeesCoverGovernor(_admin, beesCoverToken, timelockController);
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
		const admin = adminAddresses.get(getDeploymentKey(deploymentConfig));

		if (!admin) {
			throw new Error("Error. Couldn't retrieve admin address for this deployment config.");
		}

		await deployPeripherics(admin);
	})();
}