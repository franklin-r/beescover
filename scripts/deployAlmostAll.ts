import { ethers } from "hardhat";
import { FundType } from "../test/utils/enums";
import { deployBeesCoverToken } from "./deployBeesCoverToken";
import { deployMockUSDC } from "./deployMockUSDC";
import { deployWhitelists } from "./deployWhitelists";
import { deployFund } from "./deployFund";
import { deployCoverageProof } from "./deployCoverageProof";

async function main() {
	console.log("=== Deploying BeesCover Protocole ===");

	const [admin] = await ethers.getSigners();

	const mockUSDCAddress = await deployMockUSDC(admin.address);
	const whitelistsAddress = await deployWhitelists(admin.address);
	const reserveFundAddress = await deployFund(admin.address, FundType.Reserve, whitelistsAddress);
	const treasuryFundAddress = await deployFund(admin.address, FundType.Treasury, whitelistsAddress);
	const beesCoverTokenAddress = await deployBeesCoverToken(admin.address, treasuryFundAddress);
	const coverageProofAddress = await deployCoverageProof(admin.address);

	console.log("Deployment summary:");
	console.log(`MockUSDC:\t${mockUSDCAddress}`);
	console.log(`Whitelists:\t${whitelistsAddress}`);
	console.log(`ReserveFund:\t${reserveFundAddress}`);
	console.log(`TreasuryFund:\t${treasuryFundAddress}`);
	console.log(`BeesCoverToken:\t${beesCoverTokenAddress}`);
	console.log(`CoverageProof:\t${coverageProofAddress}`);
}

main().catch((error) => {
	console.error("Deployment failed: ", error);
	process.exitCode = 1;
});
