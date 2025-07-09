import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";

export async function deployArbitrator(): Promise<string> {

	// Deploy contract
	console.log("Deploying Arbitrator...");
	const arbitrator = await ethers.deployContract("Arbitrator");
	await arbitrator.waitForDeployment();

	// Detection of environment (local or other)
	const isLocalhost = network.name.includes("localhost");
	const hasEtherscanKey = !!process.env.ETHERSCAN_API_KEY;

	// If environement is not localhost, wait 3 blocks for verification
	if (!isLocalhost) {
		console.log("Waiting 3 blocks before verification...");
		await arbitrator.deploymentTransaction()?.wait(3);
	}

	// If environement isn't localhost and an Etherscan API key is available
	if (!isLocalhost && hasEtherscanKey) {
		console.log("Contract verification in block explorer...");
		// Call verification function with contract address and args
		await verify(arbitrator.target.toString());
	}

	return arbitrator.target.toString();
}

if (require.main === module) {
	(async () => {
		try {
			const arbitratorAddr = await deployArbitrator();
			console.log("Deployed at: ", arbitratorAddr);
		} catch (err) {
			console.error("Deployment failed: ", err);
			process.exit(1);
		}
	})();
}
