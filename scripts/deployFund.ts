import { ethers, network } from "hardhat";
import { verify } from "../utils/verify";
import { FundType } from "../test/utils/enums";

export async function deployFund(admin: string, fundType: FundType, whitelists: string): Promise<string> {

	const _admin = await ethers.getImpersonatedSigner(admin);

  // Deploy contract
	console.log(`Deploying Fund: ${FundType[fundType]} ...`);
	const FundFactory = await ethers.getContractFactory("Fund");
	const fund = await FundFactory.connect(_admin).deploy(FundType.Reserve, whitelists);
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
		const [admin, whitelists] = await ethers.getSigners();

		try {
			const fundAddr = await deployFund(admin.address, fundType, whitelists.address);
			console.log("Deployed at: ", fundAddr);
		} catch (err) {
			console.error("Deployment failed: ", err);
			process.exit(1);
		}
	})();
}