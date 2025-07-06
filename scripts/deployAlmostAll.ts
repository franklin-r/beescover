import { ethers } from "hardhat";
import { FundType } from "../test/utils/enums";
import { deployBeesCoverToken } from "./deployBeesCoverToken";
import { deployMockUSDC } from "./deployMockUSDC";
import { deployWhitelists } from "./deployWhitelists";
import { deployFund } from "./deployFund";
import { deployCoverageProof } from "./deployCoverageProof";
import { deployTimelockController } from "./deployTimelockController";
import { deployBeesCoverGovernor } from "./deployBeesCoverGovernor";

async function main() {
	console.log("=== Deploying BeesCover Protocole ===");

	const [admin] = await ethers.getSigners();
	const minDelay = BigInt(60 * 60 * 24 * 7);	// 1 week
	const proposers: string[] = [];
	const executors: string[] = ["0x0000000000000000000000000000000000000000"];

	const mockUSDCAddress = await deployMockUSDC(admin.address);
	const whitelistsAddress = await deployWhitelists(admin.address);
	const reserveFundAddress = await deployFund(admin.address, FundType.Reserve, whitelistsAddress);
	const treasuryFundAddress = await deployFund(admin.address, FundType.Treasury, whitelistsAddress);
	const beesCoverTokenAddress = await deployBeesCoverToken(admin.address, treasuryFundAddress);
	const coverageProofAddress = await deployCoverageProof(admin.address);
	const timelockControllerAddress = await deployTimelockController(minDelay, proposers, executors, admin.address);
	const beesCoverGovernorAddress = await deployBeesCoverGovernor(beesCoverTokenAddress, timelockControllerAddress);

	console.log("Deployment summary:");
	console.log(`MockUSDC:\t${mockUSDCAddress}`);
	console.log(`Whitelists:\t${whitelistsAddress}`);
	console.log(`ReserveFund:\t${reserveFundAddress}`);
	console.log(`TreasuryFund:\t${treasuryFundAddress}`);
	console.log(`BeesCoverToken:\t${beesCoverTokenAddress}`);
	console.log(`CoverageProof:\t${coverageProofAddress}`);
	console.log(`TimelockController:\t${timelockControllerAddress}`);
	console.log(`BeesCoverGovernor:\t${beesCoverGovernorAddress}`);
}

main().catch((error) => {
	console.error("Deployment failed: ", error);
	process.exitCode = 1;
});
