import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";
import { deployBeesCoverToken } from "./deployBeesCoverToken";
import { deployWhitelists } from "./deployWhitelists";
import { deployFund } from "./deployFund";
import { FundType } from "../test/utils/enums";
import { deployCoverageProof } from "./deployCoverageProof";
import { deployArbitrator } from "./deployArbitrator";
import { Asset, poolConfigs } from "./helpers";

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
		const [deployer] = await ethers.getSigners();

		// Update with the correct asset
		const poolConfig = poolConfigs.get(Asset.USDC);

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
			const whitelists = "0x15fb3eF714347B0d352d0e3BAAb1b53b99a587F5";
			const treasuryFund = "0xab696EB9808226B7f18cB9d6957Dd7569d52df6F";
			const reserveFund = "0xe43c3182a0025926202EdA46AA879A0EF2C1F6b1";
			const beesCoverToken = "0xFff7b5E69107FdE7195676CD057ca6c15ba2A5f0";
			const coverageProof = "0x7815C6Db8e243e90e8E80F05a5B197eAC3ec5eDB";
			const arbitrator = "0x9555a5423b4004d8ced8b9751484d9975a86aee3";

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
