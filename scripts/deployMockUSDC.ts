import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";

export async function deployMockUSDC(deployer: string): Promise<string> {

	const _deployer = await ethers.getImpersonatedSigner(deployer);

	// Deploy contract
	console.log("Deploying MockUSDC...");
	const MockUSDCFactory = await ethers.getContractFactory("MockUSDC", _deployer);
	const mockUSDC = await MockUSDCFactory.connect(_deployer).deploy();
	await mockUSDC.waitForDeployment();

	// Detection of environment (local or other)
	const isLocalhost = network.name.includes("localhost");
	const hasEtherscanKey = !!process.env.ETHERSCAN_API_KEY;

	// If environement is not localhost, wait 3 blocks for verification
	if (!isLocalhost) {
		console.log("Waiting 3 blocks before verification...");
		await mockUSDC.deploymentTransaction()?.wait(3);
	}

	// If environement isn't localhost and an Etherscan API key is available
	if (!isLocalhost && hasEtherscanKey) {
		console.log("Contract verification in block explorer...");
		// Call verification function with contract address and args
		await verify(mockUSDC.target.toString());
	}

	return mockUSDC.target.toString();
}

if (require.main === module) {
	(async () => {
		const [deployer] = await ethers.getSigners();

		try {
			const mockUSDCAddr = await deployMockUSDC(deployer.address);
			console.log("Deployed at: ", mockUSDCAddr);
		} catch (err) {
			console.error("Deployment failed: ", err);
			process.exit(1);
		}
	})();
}