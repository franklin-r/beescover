import { ethers } from "hardhat";
import { ethers as ethersjs } from "ethers";
import { TimelockController } from "../typechain-types";
import { deploymentAddresses } from "./utils/addresses";
import {
	adminAddresses,
	deploymentConfig,
	Network,
	getDeploymentKey
} from "./utils/deploymentConfig";

export async function setUpPeripherics(
	_admin: string,
	timelockController: string,
	beesCoverGovernor: string
) {

	console.log("=== Seting Up BeesCover Protocol's Peripheric Contracts ===");

	// TimelockController
	const timelockControllerContract = (await ethers.getContractAt("TimelockController", timelockController)) as unknown as TimelockController;
	const PROPOSER_ROLE = ethersjs.keccak256(ethersjs.toUtf8Bytes("PROPOSER_ROLE"));

	let admin;
	if (deploymentConfig.network == Network.FORK) {
		admin = await ethers.getImpersonatedSigner(_admin);
		await timelockControllerContract.connect(admin).grantRole(PROPOSER_ROLE, beesCoverGovernor);
	}
	else {
		await timelockControllerContract.grantRole(PROPOSER_ROLE, beesCoverGovernor);
	}
}

if (require.main === module) {
	(async () => {
		const admin = adminAddresses.get(getDeploymentKey(deploymentConfig));

		if (!admin) {
			throw new Error("Error. Couldn't retrieve admin address for this deployment config.");
		}

		try {
			const timelockController = deploymentAddresses.get("timelockController");
			const beesCoverGovernor = deploymentAddresses.get("beesCoverGovernor");

			if (!timelockController || !beesCoverGovernor) {
				throw new Error("Error. Couldn't fetch deployment addresses.");
			}

			await setUpPeripherics(admin, timelockController, beesCoverGovernor);
			console.log("Set up done!")
		} catch (err) {
			console.log("Peripherics set up failed: ", err);
			process.exit(1);
		}
	})();
}