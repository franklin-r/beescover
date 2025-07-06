import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BeesCoverToken, MockUSDC } from "../../typechain-types";

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