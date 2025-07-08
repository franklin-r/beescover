import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";

export async function deployWhitelists(admin: string): Promise<string> {

	const _admin = await ethers.getImpersonatedSigner(admin);

	// Deploy contract
	console.log("Deploying Whitelists...");
	const WhitelistsFactory = await ethers.getContractFactory("Whitelists");
	const whitelists = await WhitelistsFactory.connect(_admin).deploy();
	await whitelists.waitForDeployment();

	// Detection of environment (local or other)
	const isLocalhost = network.name.includes("localhost");
	const hasEtherscanKey = !!process.env.ETHERSCAN_API_KEY;

	// If environement is not localhost, wait 3 blocks for verification
	if (!isLocalhost) {
		console.log("Waiting 3 blocks before verification...");
		await whitelists.deploymentTransaction()?.wait(3);
	}

	// If environement isn't localhost and an Etherscan API key is available
	if (!isLocalhost && hasEtherscanKey) {
		console.log("Contract verification in block explorer...");
		// Call verification function with contract address and args
		await verify(whitelists.target.toString());
	}

	return whitelists.target.toString();
}

if (require.main === module) {
	(async () => {
		const [admin] = await ethers.getSigners();

		try {
			const whitelistsAddr = await deployWhitelists(admin.address);
			console.log("Deployed at: ", whitelistsAddr);
		} catch (err) {
			console.error("Deployment failed: ", err);
			process.exit(1);
		}
	})();
}