import { ethers } from "hardhat";
import { ethers as ethersjs } from "ethers";
import { TimelockController } from "../typechain-types";
import { deploymentAddresses } from "./addresses";

export async function setUpPeripherics(
	_admin: string,
	timelockController: string,
	beesCoverGovernor: string
) {

	console.log("=== Seting Up BeesCover Protocol's Peripheric Contracts ===");

	const admin = await ethers.getImpersonatedSigner(_admin);

	// TimelockController
	const timelockControllerContract = (await ethers.getContractAt("TimelockController", timelockController)) as unknown as TimelockController;
	const PROPOSER_ROLE = ethersjs.keccak256(ethersjs.toUtf8Bytes("PROPOSER_ROLE"));

	await timelockControllerContract.connect(admin).grantRole(PROPOSER_ROLE, beesCoverGovernor);
}

if (require.main === module) {
	(async () => {
		const admin = await ethers.getImpersonatedSigner("0x5941fd401ec7580c77ac31E45c9f59436a2f8C1b");

		try {
			const timelockController = deploymentAddresses.get("timelockController");
			const beesCoverGovernor = deploymentAddresses.get("beesCoverGovernor");

			if (!timelockController || !beesCoverGovernor) {
				throw new Error("Error. Couldn't fetch deployment addresses.");
			}

			await setUpPeripherics(admin.address, timelockController, beesCoverGovernor);
			console.log("Set up done!")
		} catch (err) {
			console.log("Peripherics set up failed: ", err);
			process.exit(1);
		}
	})();
}