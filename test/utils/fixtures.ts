import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BeesCoverToken, MockUSDC, Whitelists } from "../../typechain-types";

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