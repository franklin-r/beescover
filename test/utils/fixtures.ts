import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FundType } from "./enums";
import {
	BeesCoverToken,
	MockUSDC,
	Whitelists,
	Fund,
	LPToken
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