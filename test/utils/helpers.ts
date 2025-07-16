import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

export enum Asset {
	USDC = 0,
	WBTC = 1,
	EURS = 2,
	USDT = 3
}

export async function initAsset(assetSwitch: Asset): Promise<{
	assetAddr: string;
	assetDecimals: number;
	admin: SignerWithAddress;
}> {
	let assetAddr;
	let assetDecimals;
	let admin;

	switch (assetSwitch) {
		case Asset.USDC: {
			// Testnet USDC: https://sepolia.etherscan.io/address/0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
			assetAddr = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8";
			assetDecimals = 6;
			// USDC whale: https://sepolia.etherscan.io/token/0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8#balances
			admin = await ethers.getImpersonatedSigner("0xBBFB60a1d4e16c932B1546C9136AAd0D89f9f834");
			break;
		}
		case Asset.WBTC: {
			// Testnet WBTC: https://sepolia.etherscan.io/address/0x29f2D40B0605204364af54EC677bD022dA425d03
			assetAddr = "0x29f2D40B0605204364af54EC677bD022dA425d03";
			assetDecimals = 8;
			// WBTC whale: https://sepolia.etherscan.io/token/0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8#balances
			admin = await ethers.getImpersonatedSigner("0x55513116E735FDCcDF7EFD25B74ED5E33465a3b2");
			break;
		}
		case Asset.EURS: {
			// Testnet EURS: https://sepolia.etherscan.io/address/0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E
			assetAddr = "0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E";
			assetDecimals = 2;
			// EURS whale: https://sepolia.etherscan.io/token/0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E#balances
			admin = await ethers.getImpersonatedSigner("0xdD5De55eA6804EFb283f43b0C091C25000a6486c");
			break;
		}
		case Asset.USDT: {
			// Testnet USDT: https://sepolia.etherscan.io/address/0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0
			assetAddr = "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0";
			assetDecimals = 6;
			// USDT whale: https://sepolia.etherscan.io/token/0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0#balances
			admin = await ethers.getImpersonatedSigner("0xBBFB60a1d4e16c932B1546C9136AAd0D89f9f834");
			break;
		}
		default:
			throw new Error("Unsupported asset");
	}

	const oneEth = ethers.parseEther("1").toString(16);
	await network.provider.send("hardhat_setBalance", [admin.address, `0x${oneEth}`]);

	return {assetAddr, assetDecimals, admin};
}

export async function getInsurers(assetSwitch: Asset): Promise<{
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
}> {
	let insurer1;
	let insurer2;

	switch (assetSwitch) {
		case Asset.USDC: {
			// Chosen from https://sepolia.etherscan.io/token/0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8#balances
			insurer1 = await ethers.getImpersonatedSigner("0xc0dEC722b431c02a0787F349587B783A0f2F3281");
			insurer2 = await ethers.getImpersonatedSigner("0x19Bf4fE746c370E2930cD8C1b3DcFA55270c8eD7");
			break;
		}
		case Asset.WBTC: {
			// Chosen from https://sepolia.etherscan.io/token/0x29f2D40B0605204364af54EC677bD022dA425d03#balances
			insurer1 = await ethers.getImpersonatedSigner("0x5A2Da59ec29B888cECF955d94298BD2d30D2d763");
			insurer2 = await ethers.getImpersonatedSigner("0x492B55303116d4725Fe02188150E9610ac2ce4f9");
			break;
		}
		case Asset.EURS: {
			// Chosen from https://sepolia.etherscan.io/token/0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E#balances
			insurer1 = await ethers.getImpersonatedSigner("0x270dBB03423155aE31F466D251FFa52808aaB1a0");
			insurer2 = await ethers.getImpersonatedSigner("0xa279C80A48Ae2A910b814D061D194dA3bB8767f8");
			break;
		}
		case Asset.USDT: {
			// Chosen from https://sepolia.etherscan.io/token/0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0#balances
			insurer1 = await ethers.getImpersonatedSigner("0xc0dEC722b431c02a0787F349587B783A0f2F3281");
			insurer2 = await ethers.getImpersonatedSigner("0x19Bf4fE746c370E2930cD8C1b3DcFA55270c8eD7");
			break;
		}
		default:
			throw new Error("Unsupported asset");
	}

	const oneEth = ethers.parseEther("1").toString(16);
	await network.provider.send("hardhat_setBalance", [insurer1.address, `0x${oneEth}`]);
	await network.provider.send("hardhat_setBalance", [insurer2.address, `0x${oneEth}`]);

	return {insurer1, insurer2};
}

export async function getInsured(assetSwitch: Asset): Promise<{
	insured: SignerWithAddress;
}> {
	let insured;

	switch (assetSwitch) {
		case Asset.USDC: {
			// Chosen from https://sepolia.etherscan.io/token/0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8#balances
			insured = await ethers.getImpersonatedSigner("0x69CD43DD4ecf3a076B1B9D2CFd41589987129Bc0");
			break;
		}
		case Asset.WBTC: {
			// Chosen from https://sepolia.etherscan.io/token/0x29f2D40B0605204364af54EC677bD022dA425d03#balances
			insured = await ethers.getImpersonatedSigner("0xdD5De55eA6804EFb283f43b0C091C25000a6486c");
			break;
		}
		case Asset.EURS: {
			// Chosen from https://sepolia.etherscan.io/token/0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E#balances
			insured = await ethers.getImpersonatedSigner("0x1935Fe0CEf54EBdDc83d969F550F85d7CB29e816");
			break;
		}
		case Asset.USDT: {
			// Chosen from https://sepolia.etherscan.io/token/0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0#balances
			insured = await ethers.getImpersonatedSigner("0xdD5De55eA6804EFb283f43b0C091C25000a6486c");
			break;
		}
		default:
			throw new Error("Unsupported asset");
	}

	const oneEth = ethers.parseEther("1").toString(16);
	await network.provider.send("hardhat_setBalance", [insured.address, `0x${oneEth}`]);

	return {insured};
}

export async function getOtherUser(assetSwitch: Asset): Promise<{
	user: SignerWithAddress;
}> {
	let user;

	switch (assetSwitch) {
		case Asset.USDC: {
			// Chosen from https://sepolia.etherscan.io/token/0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8#balances
			user = await ethers.getImpersonatedSigner("0x4ac0E09D5271E1e7Ada7d5B12A8a1A85a3971D17");
			break;
		}
		case Asset.WBTC: {
			// Chosen from https://sepolia.etherscan.io/token/0x29f2D40B0605204364af54EC677bD022dA425d03#balances
			user = await ethers.getImpersonatedSigner("0xABEDb1E852b21b512b2d5B2B5DCdA877069FB2C8");
			break;
		}
		case Asset.EURS: {
			// Chosen from https://sepolia.etherscan.io/token/0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E#balances
			user = await ethers.getImpersonatedSigner("0x0917f1E33a7943C88E238304bb56BEAE7CDcE50a");
			break;
		}
		case Asset.USDT: {
			// Chosen from https://sepolia.etherscan.io/token/0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0#balances
			user = await ethers.getImpersonatedSigner("0x321Cf77D51567Ff5c6ba6490226F7697844F0BFE");
			break;
		}
		default:
			throw new Error("Unsupported asset");
	}

	const oneEth = ethers.parseEther("1").toString(16);
	await network.provider.send("hardhat_setBalance", [user.address, `0x${oneEth}`]);

	return {user};
}