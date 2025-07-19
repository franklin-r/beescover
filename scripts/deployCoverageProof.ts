import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";
import {
	adminAddresses,
	deploymentConfig,
	Network,
	getDeploymentKey
} from "./utils/deploymentConfig";

export async function deployCoverageProof(_admin: string): Promise<string> {

	// Deploy contract
	console.log("Deploying CoverageProof...");
	const CoverageProofFactory = await ethers.getContractFactory("CoverageProof");

	let admin;
	let coverageProof;
	if (deploymentConfig.network == Network.FORK) {
		admin = await ethers.getImpersonatedSigner(_admin);
		coverageProof = await CoverageProofFactory.connect(admin).deploy();
	}
	else {
		coverageProof = await CoverageProofFactory.deploy();
	}

	await coverageProof.waitForDeployment();

	// Detection of environment (local or other)
	const isLocalhost = network.name.includes("localhost");
	const hasEtherscanKey = !!process.env.ETHERSCAN_API_KEY;

	// If environement is not localhost, wait 3 blocks for verification
	if (!isLocalhost) {
		console.log("Waiting 3 blocks before verification...");
		await coverageProof.deploymentTransaction()?.wait(3);
	}

	// If environement isn't localhost and an Etherscan API key is available
	if (!isLocalhost && hasEtherscanKey) {
		console.log("Contract verification in block explorer...");
		// Call verification function with contract address and args
		await verify(coverageProof.target.toString());
	}

	return coverageProof.target.toString();
}

if (require.main === module) {
	(async () => {
		const admin = adminAddresses.get(getDeploymentKey(deploymentConfig));

		if (!admin) {
			throw new Error("Error. Couldn't retrieve admin address for this deployment config.");
		}

		try {
			const coverageProofAddr = await deployCoverageProof(admin);
			console.log("Deployed at: ", coverageProofAddr);
		} catch (err) {
			console.error("Deployment failed: ", err);
			process.exit(1);
		}
	})();
}