import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";
import { FundType } from "../test/utils/enums";
import {
	adminAddresses,
	deploymentConfig,
	Network,
	getDeploymentKey
} from "./utils/deploymentConfig";

export async function deployFund(_admin: string, fundType: FundType, whitelists: string): Promise<string> {

  // Deploy contract
	console.log(`Deploying Fund: ${FundType[fundType]} ...`);
	const FundFactory = await ethers.getContractFactory("Fund");

	let admin;
	let fund;
	if (deploymentConfig.network == Network.FORK) {
		admin = await ethers.getImpersonatedSigner(_admin);
		fund = await FundFactory.connect(admin).deploy(FundType.Reserve, whitelists);
	}
	else {
		fund = await FundFactory.deploy(FundType.Reserve, whitelists);
	}

  await fund.waitForDeployment();

	// Detection of environment (local or other)
  const isLocalhost = network.name.includes("localhost");
  const hasEtherscanKey = !!process.env.ETHERSCAN_API_KEY;

	// If environement is not localhost, wait 3 blocks for verification
  if (!isLocalhost) {
    console.log("Waiting 3 blocks before verification...");
    await fund.deploymentTransaction()?.wait(3);
  }

	// If environement isn't localhost and an Etherscan API key is available
  if (!isLocalhost && hasEtherscanKey) {
    console.log("Contract verification in block explorer...");
		// Call verification function with contract address and args
    await verify(fund.target.toString());
  }

	return fund.target.toString();
}

if (require.main === module) {
	(async () => {
		const fundType = FundType.Treasury;
		const [whitelists] = await ethers.getSigners();
		const admin = adminAddresses.get(getDeploymentKey(deploymentConfig));

		if (!admin) {
			throw new Error("Error. Couldn't retrieve admin address for this deployment config.");
		}

		try {
			const fundAddr = await deployFund(admin, fundType, whitelists.address);
			console.log("Deployed at: ", fundAddr);
		} catch (err) {
			console.error("Deployment failed: ", err);
			process.exit(1);
		}
	})();
}