import { ethers, network } from "hardhat";
import { ethers as ethersjs } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FundType } from "./enums";
import { Asset, initAsset, getInsurers, getInsured } from "./helpers";
import {
	BeesCoverToken,
	MockUSDC,
	Whitelists,
	Fund,
	LPToken,
	CoverageProof,
	TimelockController,
	BeesCoverGovernor,
	Arbitrator,
	IPool,
	InsurancePool,
	IERC20,
	IAavePoolConfigurator,
	IAaveACLManager
} from "../../typechain-types";
import { poolAsset } from "./testConfig";

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

// ============================ INSURANCE_POOL ============================== //

export async function deployInsurancePoolFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	reserveFund: Fund;
	treasuryFund: Fund;
	whitelists: Whitelists;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
}> {
	let assetSwitch: Asset = poolAsset;
	const {assetAddr, assetDecimals, admin} = await initAsset(assetSwitch);

	const asset = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", assetAddr)) as unknown as IERC20;
	//console.log(`Admin IERC20(asset) balance before transfer: ${await asset.balanceOf(admin.address)}`);

	// Aave Pool
	// See Pool at: https://aave.com/docs/resources/addresses
	const aavePoolAddr = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
	const aavePool = await ethers.getContractAt("IPool", aavePoolAddr) as IPool;
	// const reserveData = await aavePool.getReserveData(asset.getAddress());
	//console.log(`aToken address: ${reserveData.aTokenAddress}`);	// = 0x16dA4541aD1807f4443d92D26044C1147406EB80

	// Whitelist
	const WhitelistsFactory = await ethers.getContractFactory("Whitelists");
	const whitelists = await WhitelistsFactory.connect(admin).deploy() as Whitelists;

	// Reserve & Treasury Funds
	const FundFactory = await ethers.getContractFactory("Fund");
	const reserveFund = await FundFactory.connect(admin).deploy(FundType.Reserve, whitelists.getAddress()) as Fund;
	const treasuryFund = await FundFactory.connect(admin).deploy(FundType.Treasury, whitelists.getAddress()) as Fund;
	// Fund reserve fund with 1_000_000 IERC20(asset)
	// await asset.connect(admin).transfer(reserveFund.getAddress(), 1_000_000n * 1_000_000n);
	//console.log(`Admin IERC20(asset) balance after transfer: ${await asset.balanceOf(admin.address)}`);
	//console.log(`ReserveFund IERC20(asset) balance: ${await asset.balanceOf(reserveFund.getAddress())}`);

	// BeesCoverToken
	const BeesCoverTokenFactory = await ethers.getContractFactory("BeesCoverToken");
	const beesCoverToken = await BeesCoverTokenFactory.connect(admin).deploy(treasuryFund.getAddress()) as BeesCoverToken;
	//console.log(`TreasuryFund BEE balance: ${await beesCoverToken.balanceOf(treasuryFund.getAddress())}`);

	// CoverageProof
	const CoverageProofFactory = await ethers.getContractFactory("CoverageProof");
	const coverageProof = await CoverageProofFactory.connect(admin).deploy() as CoverageProof;

	// Arbitrator
	const ArbitratorFactory = await ethers.getContractFactory("Arbitrator");
	const arbitrator = await ArbitratorFactory.connect(admin).deploy() as Arbitrator;

	const InsurancePoolFactory = await ethers.getContractFactory("InsurancePool");
	const insurancePool = await InsurancePoolFactory.connect(admin).deploy(
		whitelists,
		treasuryFund,
		reserveFund,
		beesCoverToken,
		coverageProof,
		arbitrator,
		asset,
		0n,	// poolId
		5n,	// risk
		"metaEvidence_link"										// Meta evidence link
	) as InsurancePool;
	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator};
}

export async function setUpInsurancePoolFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator} = await loadFixture(deployInsurancePoolFixture);

	// Fund reserve fund with 1_000_000 IERC20(asset)
	await asset.connect(admin).transfer(reserveFund.getAddress(), 1_000_000n * BigInt(10**assetDecimals));

	// Whitelists
	const assets = [await asset.getAddress()];
	const reserveTargets = [await insurancePool.getAddress()];
	const treasuryTargets = [admin.address];
	await whitelists.connect(admin).add(assets, reserveTargets, treasuryTargets);

	// Reserve Fund
	const FUND_ADMIN_ROLE = ethersjs.keccak256(ethersjs.toUtf8Bytes("FUND_ADMIN_ROLE"));
	await reserveFund.connect(admin).grantRole(FUND_ADMIN_ROLE, insurancePool.getAddress());

	// BeesCoverToken
	const MINTER_ROLE = ethersjs.keccak256(ethersjs.toUtf8Bytes("MINTER_ROLE"));
	await beesCoverToken.connect(admin).grantRole(MINTER_ROLE, insurancePool.getAddress());

	// CoverageProof
	const COVERAGE_PROOF_ADMIN_ROLE = ethersjs.keccak256(ethersjs.toUtf8Bytes("COVERAGE_PROOF_ADMIN_ROLE"));
	await coverageProof.connect(admin).grantRole(COVERAGE_PROOF_ADMIN_ROLE, insurancePool.getAddress());

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator};
}

export async function removeAavePoolSupplyCapFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator} = await loadFixture(setUpInsurancePoolFixture);

	// ACL Manager
	// See ACLAdmin at https://aave.com/docs/resources/addresses
	const aclAdminAddr = "0xfA0e305E0f46AB04f00ae6b5f4560d61a2183E00";
	const aclAdmin = await ethers.getImpersonatedSigner(aclAdminAddr);
	const [newPoolAdmin] = await ethers.getSigners();
	// See ACLManager at https://aave.com/docs/resources/addresses
	const aclManagerAddr = "0x7F2bE3b178deeFF716CD6Ff03Ef79A1dFf360ddD";
	const aclManager = (await ethers.getContractAt("IAaveACLManager", aclManagerAddr)) as unknown as IAaveACLManager;
	await aclManager.connect(aclAdmin).addPoolAdmin(newPoolAdmin.address);

	// Pool Configurator
	// See PoolConfigurator at https://aave.com/docs/resources/addresses
	const poolConfiguratorAddr = "0x7Ee60D184C24Ef7AfC1Ec7Be59A0f448A0abd138";
	const poolConfigurator = (await ethers.getContractAt("IAavePoolConfigurator", poolConfiguratorAddr)) as unknown as IAavePoolConfigurator;
	await poolConfigurator.connect(newPoolAdmin).setSupplyCap(asset.getAddress(), 0);	// 0 => no cap

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator};
}

export async function provideLiquidityFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator} = await loadFixture(removeAavePoolSupplyCapFixture);

	const {insurer1, insurer2} = await getInsurers(assetSwitch);

	const amount1 = 10_000n * BigInt(10**assetDecimals);
	const amount2 = 15_000n * BigInt(10**assetDecimals);

	await asset.connect(insurer1).approve(insurancePool.getAddress(), amount1);
	await asset.connect(insurer2).approve(insurancePool.getAddress(), amount2);

	await insurancePool.connect(insurer1).deposit(amount1);
	await insurancePool.connect(insurer2).deposit(amount2);
	//console.log(`InsurancePool total liquidity: ${await insurancePool.totalLiquidity()}`);

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2};
}

export async function requestWithdrawalFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2} = await loadFixture(provideLiquidityFixture);

	await insurancePool.connect(insurer1).requestWithdrawal(5_000n * BigInt(10**assetDecimals));

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2};
}

export async function buyCoverageFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2} = await loadFixture(provideLiquidityFixture);

	const {insured} = await getInsured(assetSwitch);

	const oneEth = ethers.parseEther("1").toString(16);
	await network.provider.send("hardhat_setBalance", [insured.address, `0x${oneEth}`]);

	const coverAmount = 3_000n * BigInt(10**assetDecimals);
	const coverDuration = 60n;	// 60 days

	const premium = await insurancePool.connect(insured).computePremium(coverAmount, coverDuration);

	await asset.connect(insured).approve(insurancePool.getAddress(), premium);

	await insurancePool.connect(insured).buyCoverage(coverAmount, coverDuration);

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}

export async function extremeBuyCoverageFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2} = await loadFixture(provideLiquidityFixture);


	const {insured} = await getInsured(assetSwitch);
	const coverAmount = 18_750n * BigInt(10**assetDecimals);	// Max coverage capacity
	const coverDuration = 30n;	// 60 days
	const premium = await insurancePool.connect(insured).computePremium(coverAmount, coverDuration);

	await asset.connect(insured).approve(insurancePool.getAddress(), premium);
	await insurancePool.connect(insured).buyCoverage(coverAmount, coverDuration);

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}

export async function extremeRequestWithdrawalFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured} = await loadFixture(extremeBuyCoverageFixture);

	await insurancePool.connect(insurer1).requestWithdrawal(10_000n * BigInt(10**assetDecimals));

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}

export async function extremeWithdrawalFixture(): Promise <{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured} = await loadFixture(extremeRequestWithdrawalFixture);

	const lpTokenAddr = await insurancePool.lpToken();
	const lpToken = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", lpTokenAddr)) as unknown as IERC20;
	const WITHDRAWAL_DELAY = 60n * 60n * 24n * 30n;	// Seconds in 30 days

	await network.provider.send("evm_increaseTime", [Number(WITHDRAWAL_DELAY)]);
	await network.provider.send("evm_mine");

	const withdrawReq = await insurancePool.withdrawalRequests(insurer1.address);
	const withdrawAmount = withdrawReq[0];	// amount

	await lpToken.connect(insurer1).approve(insurancePool.getAddress(), withdrawAmount);

	await insurancePool.connect(insurer1).executeWithdrawal();

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}

export async function createClaimFixture(): Promise <{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured} = await loadFixture(buyCoverageFixture);

	const tokenId = 0n;
	const evidenceURI = "ipfs://link-to-evidence";
	const arbitrationCost = await arbitrator.arbitrationCost("0x");

	await insurancePool.connect(insured).createClaim(tokenId, evidenceURI, {value: arbitrationCost});

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}

export async function ruleAbstainFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured} = await loadFixture(createClaimFixture);

	const disputeId = 0n;

	await arbitrator.giveRuling(disputeId, 0n);

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}

export async function ruleYesFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured} = await loadFixture(createClaimFixture);

	const disputeId = 0n;

	await arbitrator.giveRuling(disputeId, 1n);

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}

export async function ruleNoFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured} = await loadFixture(createClaimFixture);

	const disputeId = 0n;

	await arbitrator.giveRuling(disputeId, 2n);

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}

export async function extremeCreateClaimFixture(): Promise <{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured} = await loadFixture(extremeWithdrawalFixture);

	const tokenId = 0n;
	const evidenceURI = "ipfs://link-to-evidence";
	const arbitrationCost = await arbitrator.arbitrationCost("");

	await insurancePool.connect(insured).createClaim(tokenId, evidenceURI, {value: arbitrationCost});

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}

export async function extremeRuleYesFixture(): Promise<{
	assetSwitch: Asset;
	insurancePool: InsurancePool;
	admin: SignerWithAddress;
	asset: IERC20;
	assetDecimals: number;
	aavePool: IPool;
	whitelists: Whitelists;
	treasuryFund: Fund;
	reserveFund: Fund;
	beesCoverToken: BeesCoverToken;
	coverageProof: CoverageProof;
	arbitrator: Arbitrator;
	insurer1: SignerWithAddress;
	insurer2: SignerWithAddress;
	insured: SignerWithAddress;
}> {
	const {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured} = await loadFixture(extremeCreateClaimFixture);

	const disputeId = 0n;

	await arbitrator.giveRuling(disputeId, 1n);

	return {assetSwitch, insurancePool, admin, asset, assetDecimals, aavePool, whitelists, treasuryFund, reserveFund, beesCoverToken, coverageProof, arbitrator, insurer1, insurer2, insured};
}