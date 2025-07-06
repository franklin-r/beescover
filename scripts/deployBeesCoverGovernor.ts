import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";
import { deployBeesCoverToken } from "./deployBeesCoverToken";
import { deployTimelockController } from "./deployTimelockController";

export async function deployBeesCoverGovernor(tokenAddr: string, timelockControllerAddr: string): Promise<string> {

	// Deploy contract
	console.log("Deploying BeesCoverGovernor...");
	const beesCoverGovernor = await ethers.deployContract("BeesCoverGovernor", [tokenAddr, timelockControllerAddr]);
	await beesCoverGovernor.waitForDeployment();

	// Detection of environment (local or other)
	const isLocalhost = network.name.includes("localhost");
	const hasEtherscanKey = !!process.env.ETHERSCAN_API_KEY;

	// If environement is not localhost, wait 3 blocks for verification
	if (!isLocalhost) {
		console.log("Waiting 3 blocks before verification...");
		await beesCoverGovernor.deploymentTransaction()?.wait(3);
	}

	// If environement isn't localhost and an Etherscan API key is available
	if (!isLocalhost && hasEtherscanKey) {
		console.log("Contract verification in block explorer...");
		// Call verification function with contract address and args
		await verify(beesCoverGovernor.target.toString());
	}

	return beesCoverGovernor.target.toString();
}

if (require.main === module) {
  (async () => {
    const [deployer, recipient] = await ethers.getSigners();
    const minDelay = BigInt(60 * 60 * 24 * 7);	// 1 week
    const proposers: string[] = [];
    const executors: string[] = ["0x0000000000000000000000000000000000000000"];

    try {
      const tokenAddr = await deployBeesCoverToken(deployer.address, recipient.address);
      const timelockControllerAddr = await deployTimelockController(minDelay, proposers, executors, deployer.address);
      const governorAddr = await deployBeesCoverGovernor(tokenAddr, timelockControllerAddr);
      console.log("Deployed at: ", governorAddr);
    } catch (err) {
      console.error("Deployment failed: ", err);
      process.exit(1);
    }
  })();
}
