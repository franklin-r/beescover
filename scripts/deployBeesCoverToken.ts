import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";
import {
	adminAddresses,
	deploymentConfig,
	Network,
	getDeploymentKey
} from "./utils/deploymentConfig";

export async function deployBeesCoverToken(_admin: string, recipient: string): Promise<string> {

	// Deploy contract
	console.log("Deploying BeesCoverToken...");
	const BeesCoverTokenFactory = await ethers.getContractFactory("BeesCoverToken");

	let admin;
	let beesCoverToken;
	if (deploymentConfig.network == Network.FORK) {
		admin = await ethers.getImpersonatedSigner(_admin);
		beesCoverToken = await BeesCoverTokenFactory.connect(admin).deploy(recipient);
	}
	else {
		beesCoverToken = await BeesCoverTokenFactory.deploy(recipient);
	}

	await beesCoverToken.waitForDeployment();

	// Detection of environment (local or other)
	const isLocalhost = network.name.includes("localhost");
	const hasEtherscanKey = !!process.env.ETHERSCAN_API_KEY;

	// If environement is not localhost, wait 3 blocks for verification
	if (!isLocalhost) {
		console.log("Waiting 3 blocks before verification...");
		await beesCoverToken.deploymentTransaction()?.wait(3);
	}

	// If environement isn't localhost and an Etherscan API key is available
	if (!isLocalhost && hasEtherscanKey) {
		console.log("Contract verification in block explorer...");
		// Call verification function with contract address and args
		await verify(beesCoverToken.target.toString(), [recipient]);
	}

	return beesCoverToken.target.toString();
}

if (require.main === module) {
  (async () => {
    const admin = adminAddresses.get(getDeploymentKey(deploymentConfig));
		const recipient = admin;

		if (!admin || !recipient) {
			throw new Error("Error. Couldn't retrieve admin address for this deployment config.");
		}

    try {
      const beesCoverTokenAddr = await deployBeesCoverToken(admin, recipient);
      console.log("Deployed at: ", beesCoverTokenAddr);
    } catch (err) {
      console.error("Deployment failed: ", err);
      process.exit(1);
    }
  })();
}