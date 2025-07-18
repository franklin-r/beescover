import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";
import { deployBeesCoverToken } from "./deployBeesCoverToken";
import { deployWhitelists } from "./deployWhitelists";
import { deployFund } from "./deployFund";
import { FundType } from "../test/utils/enums";
import { deployCoverageProof } from "./deployCoverageProof";
import { deployArbitrator } from "./deployArbitrator";
import { Asset, poolConfigs } from "./utils/helpers";
import { deploymentAddresses } from "./utils/addresses";

export async function deployInsurancePool(
	_admin: string,
	whitelists: string,
	treasuryFund: string,
	reserveFund: string,
	beesCoverToken: string,
	coverageProof: string,
	arbitrator: string,
	asset: string,
	poolId: bigint,
	risk: bigint,
	metaEvidence: string
): Promise<{
	insurancePoolAddr: string,
	lpToken: string
}> {

	const admin = await ethers.getImpersonatedSigner(_admin);

	// Deploy contract
	console.log("=== Deploying BeesCover Protocol's Insurance Pool Contract ===");
	const InsurancePoolFactory = await ethers.getContractFactory("InsurancePool");
	const insurancePool = await InsurancePoolFactory.connect(admin).deploy(
		whitelists,
		treasuryFund,
		reserveFund,
		beesCoverToken,
		coverageProof,
		arbitrator,
		asset,
		poolId,
		risk,
		metaEvidence
	);
	await insurancePool.waitForDeployment();

	// Detection of environment (local or other)
	const isLocalhost = network.name.includes("localhost");
	const hasEtherscanKey = !!process.env.ETHERSCAN_API_KEY;

	// If environement is not localhost, wait 3 blocks for verification
	if (!isLocalhost) {
		console.log("Waiting 3 blocks before verification...");
		await insurancePool.deploymentTransaction()?.wait(3);
	}

	// LP Token address
	const lpToken = await insurancePool.lpToken();

	// If environement isn't localhost and an Etherscan API key is available
	if (!isLocalhost && hasEtherscanKey) {
		console.log("Contract verification in block explorer...");
		// Call verification function with contract address and args
		await verify(insurancePool.target.toString());
		await verify(lpToken);
	}

	const insurancePoolAddr = insurancePool.target.toString();

	return {insurancePoolAddr, lpToken};
}

if (require.main === module) {
	(async () => {
		// Update with the correct admin
		const deployer = await ethers.getImpersonatedSigner("0x5941fd401ec7580c77ac31E45c9f59436a2f8C1b");

		// Update with the correct asset
		const poolConfig = poolConfigs.get(Asset.EURS);

		if (!poolConfig) {
			throw new Error("Error. Asset unsuported.");
		}

		try {
			/*
			const whitelists = await deployWhitelists(deployer.address);
			const treasuryFund = await deployFund(deployer.address, FundType.Treasury, whitelists);
			const reserveFund = await deployFund(deployer.address, FundType.Reserve, whitelists);
			const beesCoverToken = await deployBeesCoverToken(deployer.address, treasuryFund);
			const coverageProof = await deployCoverageProof(deployer.address);
			const arbitrator = await deployArbitrator();
			*/
			// Update after deployment
			const whitelists = deploymentAddresses.get("whitelists");
			const treasuryFund = deploymentAddresses.get("treasuryFund");
			const reserveFund = deploymentAddresses.get("reserveFund");
			const beesCoverToken = deploymentAddresses.get("beesCoverToken");
			const coverageProof = deploymentAddresses.get("coverageProof");
			const arbitrator = deploymentAddresses.get("arbitrator");

			if (!whitelists || !treasuryFund || !reserveFund || !beesCoverToken || !coverageProof || !arbitrator) {
				throw new Error("Error. Couldn't fetch deployment addresses.");
			}

			const insurancePool = await deployInsurancePool(
				deployer.address,
				whitelists,
				treasuryFund,
				reserveFund,
				beesCoverToken,
				coverageProof,
				arbitrator,
				poolConfig.addr,
				poolConfig.poolId,
				poolConfig.risk,
				poolConfig.metaEvidence
			);
			console.log("Deployed at: ", insurancePool);
		} catch (err) {
			console.error("Deployment failed: ", err);
			process.exit(1);
		}
	})();
}
