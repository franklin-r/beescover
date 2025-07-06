import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FundType } from "./enums";
import {
	BeesCoverToken,
	MockUSDC,
	Whitelists,
	Fund,
	LPToken,
	CoverageProof,
	TimelockController,
	BeesCoverGovernor
} from "../../typechain-types";

// ============================ BEES_COVER_TOKEN ============================ //

export async function deployBeesCoverTokenFixture(): Promise<{
	beesCoverToken: BeesCoverToken;
	deployer: SignerWithAddress;
	recipient: SignerWithAddress;
}> {
	const [deployer, recipient] = await ethers.getSigners();
	const BeesCoverTokenFactory = await ethers.getContractFactory("BeesCoverToken");
	const beesCoverToken = await BeesCoverTokenFactory.connect(deployer).deploy(recipient.address) as BeesCoverToken;
	return {beesCoverToken, deployer, recipient};
}

// ================================ MOCK_USDC ================================ //

export async function deployMockUSDCFixture(): Promise<{
	mockUSDC: MockUSDC;
}> {
	const [deployer] = await ethers.getSigners();
	const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
	const mockUSDC = await MockUSDCFactory.connect(deployer).deploy() as MockUSDC;
	return {mockUSDC};
}

// =============================== WHITELISTS =============================== //

export async function deployWhitelistsFixture(): Promise<{
	whitelists: Whitelists;
	admin: SignerWithAddress;
}> {
	const [admin] = await ethers.getSigners();
	const WhitelistsFactory = await ethers.getContractFactory("Whitelists");
	const whitelists = await WhitelistsFactory.connect(admin).deploy() as Whitelists;
	return {whitelists, admin};
}

export async function whitelistsAddFixture(): Promise<{
	whitelists: Whitelists;
	admin: SignerWithAddress;
	assets: string[];
	reserveTargets: string[];
	treasuryTargets: string[];
}> {
	const assets = [ethers.Wallet.createRandom().address];
	const reserveTargets = [ethers.Wallet.createRandom().address];
	const treasuryTargets = [ethers.Wallet.createRandom().address];
	const {whitelists, admin} = await loadFixture(deployWhitelistsFixture);
	await whitelists.connect(admin).add(assets, reserveTargets, treasuryTargets);
	return {whitelists, admin, assets, reserveTargets, treasuryTargets};
}

// ================================== FUND ================================== //

async function setUpFundDeploymentFixture(): Promise<{
	mockUSDC: MockUSDC;
	whitelists: Whitelists;
	assets: string[];
	reserveTargets: string[];
}> {
	const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
	const mockUSDC = await MockUSDCFactory.deploy() as MockUSDC;
	const [whitelistsAdmin] = await ethers.getSigners();
	const WhitelistsFactory = await ethers.getContractFactory("Whitelists");
	const whitelists = await WhitelistsFactory.connect(whitelistsAdmin).deploy() as Whitelists;
	const assets = [await mockUSDC.getAddress()];
	const reserveTargets = [ethers.Wallet.createRandom().address];
	await whitelists.connect(whitelistsAdmin).add(assets, reserveTargets, []);
	return {mockUSDC, whitelists, assets, reserveTargets};
}

export async function deployFundFixture(): Promise<{
	fund: Fund;
	fundAdmin: SignerWithAddress;
	assets: string[];
	reserveTargets: string[];
	mockUSDC: MockUSDC;
	whitelists: Whitelists;
}> {
	const {mockUSDC, whitelists, assets, reserveTargets} = await loadFixture(setUpFundDeploymentFixture);
	const [fundAdmin] = await ethers.getSigners();
	const FundFactory = await ethers.getContractFactory("Fund");
	const fund = await FundFactory.connect(fundAdmin).deploy(FundType.Reserve, whitelists.getAddress()) as Fund;
	return {fund, fundAdmin, assets, reserveTargets, mockUSDC, whitelists};
}

// ================================ LP_TOKEN ================================ //

export async function deployLPTokenFixture(): Promise<{
	lpToken: LPToken;
}> {
	const LPTokenFactory = await ethers.getContractFactory("LPToken");
	const lpToken = await LPTokenFactory.deploy("LPToken", "LPT") as LPToken;
	return {lpToken};
}

// ============================= COVERAGE_PROOF ============================= //

export async function deployCoverageProofFixture(): Promise<{
	coverageProof: CoverageProof;
	admin: SignerWithAddress;
}> {
	const [admin] = await ethers.getSigners();
	const CoverageProofFactory = await ethers.getContractFactory("CoverageProof");
	const coverageProof = await CoverageProofFactory.connect(admin).deploy() as CoverageProof;
	return {coverageProof, admin};
}

export async function mintNFTFixture(): Promise<{
	coverageProof: CoverageProof;
	admin: SignerWithAddress;
	recipient: SignerWithAddress;
}> {
	const [, recipient] = await ethers.getSigners();
	const {coverageProof, admin} = await loadFixture(deployCoverageProofFixture);
	await coverageProof.connect(admin).safeMint(recipient.address, 100n, 1000000n, 1n);
	return {coverageProof, admin, recipient};
}

// ========================== TIMELOCK_CONTROLLER =========================== //

export async function deployTimelockControllerFixture():  Promise<{
	timelockController: TimelockController;
	timelockControllerAdmin: SignerWithAddress;
}> {
	const minDelay = BigInt(60 * 60 * 24 * 7);	// 1 week
	const proposers: string[] = [];
	const executors: string[] = ["0x0000000000000000000000000000000000000000"];
	const [timelockControllerAdmin] = await ethers.getSigners();
	const TimelockControllerFactory = await ethers.getContractFactory("TimelockController");
	const timelockController = await TimelockControllerFactory.deploy(minDelay, proposers, executors, timelockControllerAdmin) as TimelockController;
	return {timelockController, timelockControllerAdmin};
}

// ========================== BEES_COVER_GOVERNOR =========================== //

export async function deployContractFixture(): Promise<{
	beesCoverGovernor: BeesCoverGovernor;
	mockUSDC: MockUSDC;
	timelockController: TimelockController;
	beesCoverToken: BeesCoverToken;
}> {
	const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
	const mockUSDC = await MockUSDCFactory.deploy() as MockUSDC;
	const [minter] = await ethers.getSigners();
	const BeesCoverTokenFactory = await ethers.getContractFactory("BeesCoverToken");
	const beesCoverToken = await BeesCoverTokenFactory.deploy(minter.address) as BeesCoverToken;
	const {timelockController} = await loadFixture(deployTimelockControllerFixture);
	const BeesCoverGovernorFactory = await ethers.getContractFactory("BeesCoverGovernor");
	const beesCoverGovernor = await BeesCoverGovernorFactory.deploy(beesCoverToken.getAddress(), timelockController.getAddress()) as BeesCoverGovernor;
	return {beesCoverGovernor, mockUSDC, timelockController, beesCoverToken};
}

export async function governorSetUpFixture(): Promise<{
	beesCoverGovernor: BeesCoverGovernor;
	admin: SignerWithAddress;
	mockUSDC: MockUSDC;
	timelockController: TimelockController;
	beesCoverToken: BeesCoverToken;
}> {
	const [admin] = await ethers.getSigners();
	const {beesCoverGovernor, mockUSDC, timelockController, beesCoverToken} = await loadFixture(deployContractFixture);

	// Set up roles
	await timelockController.grantRole(await timelockController.PROPOSER_ROLE(), beesCoverGovernor.getAddress());
	await timelockController.grantRole(await timelockController.EXECUTOR_ROLE(), "0x0000000000000000000000000000000000000000");
	await timelockController.renounceRole(await timelockController.DEFAULT_ADMIN_ROLE(), admin.address);

	// Set up delegate
	await beesCoverToken.delegate(admin.address);

	return {beesCoverGovernor, admin, mockUSDC, timelockController, beesCoverToken};
}