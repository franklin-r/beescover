import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";

export async function deployBeesCoverToken(deployer: string, recipient: string): Promise<string> {

	const _deployer = await ethers.getImpersonatedSigner(deployer);

	// Deploy contract
	console.log("Deploying BeesCoverToken...");
	const BeesCoverTokenFactory = await ethers.getContractFactory("BeesCoverToken", _deployer);
	const beesCoverToken = await BeesCoverTokenFactory.connect(_deployer).deploy(recipient);
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
		await verify(beesCoverToken.target.toString());
	}

	return beesCoverToken.target.toString();
}

if (require.main === module) {
  (async () => {
    const [deployer, recipient] = await ethers.getSigners();

    try {
      const beesCoverTokenAddr = await deployBeesCoverToken(deployer.address, recipient.address);
      console.log("Deployed at: ", beesCoverTokenAddr);
    } catch (err) {
      console.error("Deployment failed: ", err);
      process.exit(1);
    }
  })();
}