import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { BeesCoverToken } from "../../typechain-types";

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