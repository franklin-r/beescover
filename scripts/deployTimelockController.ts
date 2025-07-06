import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";

export async function deployTimelockController(minDelay: bigint, proposers: string[], executors: string[], admin: string): Promise<string> {

	// Deploy contract
	console.log("Deploying TimelockController...");
	const timelockController = await ethers.deployContract("TimelockController", [minDelay, proposers, executors, admin]);
	await timelockController.waitForDeployment();

	// Detection of environment (local or other)
	const isLocalhost = network.name.includes("localhost");
	const hasEtherscanKey = !!process.env.ETHERSCAN_API_KEY;

	// If environement is not localhost, wait 3 blocks for verification
	if (!isLocalhost) {
		console.log("Waiting 3 blocks before verification...");
		await timelockController.deploymentTransaction()?.wait(3);
	}

	// If environement isn't localhost and an Etherscan API key is available
	if (!isLocalhost && hasEtherscanKey) {
		console.log("Contract verification in block explorer...");
		// Call verification function with contract address and args
		await verify(timelockController.target.toString());
	}

	return timelockController.target.toString();
}

if (require.main === module) {
  (async () => {
    const [admin] = await ethers.getSigners();
    const minDelay = BigInt(60 * 60 * 24 * 7);	// 1 week
    const proposers: string[] = [];
    const executors: string[] = ["0x0000000000000000000000000000000000000000"];

    try {
      const timelockControllerAddr = await deployTimelockController(minDelay, proposers, executors, admin.address);
      console.log("Deployed at: ", timelockControllerAddr);
    } catch (err) {
      console.error("Deployment failed: ", err);
      process.exit(1);
    }
  })();
}