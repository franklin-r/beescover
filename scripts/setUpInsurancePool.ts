import { ethers } from "hardhat";
import { ethers as ethersjs } from "ethers";
import { IERC20,
	Whitelists,
	Fund,
	BeesCoverToken,
	CoverageProof,
	TimelockController,
	InsurancePool
} from "../typechain-types";
import { Asset, poolConfigs } from "./utils/helpers";
import { deploymentAddresses } from "./utils/addresses";
import { WhitelistType } from "../test/utils/enums";
import {
	adminAddresses,
	deploymentConfig,
	Network,
	getDeploymentKey,
	deploymentAsset
} from "./utils/deploymentConfig";

export async function setUpInsurancePool(
	_admin: string,
	asset: Asset,
	insurancePool: string,
	whitelists: string,
	reserveFund: string,
	beesCoverToken: string,
	coverageProof: string,
	timelockController: string
) {
	console.log("=== Setting Up BeesCover Protocol's Insurance Pool Contract ===");

	let admin;
	if (deploymentConfig.network == Network.FORK) {
		admin = await ethers.getImpersonatedSigner(_admin);
	}

	// Update asset
	const poolConfig = poolConfigs.get(asset);

	if (!poolConfig) {
		throw new Error("Error. Asset unsuported.");
	}

	const assetAddr = poolConfig.addr;
	const assetContract = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", assetAddr)) as unknown as IERC20;

	// Funds reserve fund with 1_000_000 IERC20(asset)
	if (deploymentConfig.network == Network.FORK) {
		await assetContract.connect(admin).transfer(reserveFund, poolConfig.reserveFunding * BigInt(10**poolConfig.decimals));
	}
	else {
		await assetContract.transfer(reserveFund, poolConfig.reserveFunding * BigInt(10**poolConfig.decimals));
	}

	// Whitelists
	const whitelistsContract = (await ethers.getContractAt("Whitelists", whitelists)) as unknown as Whitelists;
	const isAdminAlreadyWhitelisted = await whitelistsContract.isAddressWhitelisted(_admin, WhitelistType.Treasury);
	const assets = [assetAddr];
	const reserveTargets = [insurancePool];
	const treasuryTargets = isAdminAlreadyWhitelisted ? [] : [_admin];
	if (deploymentConfig.network == Network.FORK) {
		await whitelistsContract.connect(admin).add(assets, reserveTargets, treasuryTargets);
	}
	else {
		await whitelistsContract.add(assets, reserveTargets, []);
	}

	// Reserve Fund
	const reserveFundContract = (await ethers.getContractAt("Fund", reserveFund)) as unknown as Fund;
	const FUND_ADMIN_ROLE = ethersjs.keccak256(ethersjs.toUtf8Bytes("FUND_ADMIN_ROLE"));
	if (deploymentConfig.network == Network.FORK) {
		await reserveFundContract.connect(admin).grantRole(FUND_ADMIN_ROLE, insurancePool);
	}
	else {
		await reserveFundContract.grantRole(FUND_ADMIN_ROLE, insurancePool);
	}

	// BeesCoverToken
	const beesCoverTokenContract = (await ethers.getContractAt("BeesCoverToken", beesCoverToken)) as unknown as BeesCoverToken;
	const MINTER_ROLE = ethersjs.keccak256(ethersjs.toUtf8Bytes("MINTER_ROLE"));
	if (deploymentConfig.network == Network.FORK) {
		await beesCoverTokenContract.connect(admin).grantRole(MINTER_ROLE, insurancePool);
	}
	else {
		await beesCoverTokenContract.grantRole(MINTER_ROLE, insurancePool);
	}

	// CoverageProof
	const coverageProofContract = (await ethers.getContractAt("CoverageProof", coverageProof)) as unknown as CoverageProof;
	const COVERAGE_PROOF_ADMIN_ROLE = ethersjs.keccak256(ethersjs.toUtf8Bytes("COVERAGE_PROOF_ADMIN_ROLE"));
	if (deploymentConfig.network == Network.FORK) {
		await coverageProofContract.connect(admin).grantRole(COVERAGE_PROOF_ADMIN_ROLE, insurancePool);
	}
	else {
		await coverageProofContract.grantRole(COVERAGE_PROOF_ADMIN_ROLE, insurancePool);
	}

	// InsurancePool
	const insurancePoolContract = (await ethers.getContractAt("InsurancePool", insurancePool)) as unknown as InsurancePool;
	const INSURANCE_POOL_ADMIN_ROLE = ethersjs.keccak256(ethersjs.toUtf8Bytes("INSURANCE_POOL_ADMIN_ROLE"));
	if (deploymentConfig.network == Network.FORK) {
		await insurancePoolContract.connect(admin).grantRole(INSURANCE_POOL_ADMIN_ROLE, timelockController);
	}
	else {
		await insurancePoolContract.grantRole(INSURANCE_POOL_ADMIN_ROLE, timelockController);
	}
}

if (require.main === module) {
	(async () => {
		const admin = adminAddresses.get(getDeploymentKey(deploymentConfig));

		if (!admin) {
			throw new Error("Error. Couldn't retrieve admin address for this deployment config.");
		}

		try {
			const insurancePool = deploymentAddresses.get("insurancePool");
			const whitelists = deploymentAddresses.get("whitelists");
			const reserveFund = deploymentAddresses.get("reserveFund");
			const beesCoverToken = deploymentAddresses.get("beesCoverToken");
			const coverageProof = deploymentAddresses.get("coverageProof");
			const timelockController = deploymentAddresses.get("timelockController");

			if (!insurancePool || !whitelists || !reserveFund || !beesCoverToken || !coverageProof || !timelockController) {
				throw new Error("Error. Couldn't fetch deployment addresses.");
			}

			await setUpInsurancePool(admin, deploymentAsset, insurancePool, whitelists, reserveFund, beesCoverToken, coverageProof, timelockController);
			console.log("Set up done!")
		} catch (err) {
			console.log("Set up failed: ", err);
			process.exit(1);
		}
	})();
}