export enum Asset {
	USDC = 0,
	WBTC = 1,
	EURS = 2,
	USDT = 3
}

export type PoolConfig = {
	addr: string;
	poolId: bigint;
	risk: bigint;
	metaEvidence: string;
}

export const poolConfigs = new Map<Asset, PoolConfig>();
poolConfigs.set(Asset.USDC, {
	addr: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
	poolId: 0n,
	risk: 3n,
	metaEvidence: "bafkreigjksvanqwj227hceogbwxhkc4olyt225nrq7r3yogsa2bnppwyxi"
});
poolConfigs.set(Asset.WBTC, {
	addr: "0x29f2D40B0605204364af54EC677bD022dA425d03",
	poolId: 1n,
	risk: 5n,
	metaEvidence: "bafkreigmu3s56w6lwxum4ps5muxobifemulmbtitb3f3z7f23te3jmlx3m"
});
poolConfigs.set(Asset.EURS, {
	addr: "0x6d906e526a4e2Ca02097BA9d0caA3c382F52278E",
	poolId: 2n,
	risk: 7n,
	metaEvidence: "bafkreidjt643cfeduq3lkfb66lhqpymo4dbfhi3l3kgqwxzlsu3r3xyjhi"
});
poolConfigs.set(Asset.USDT, {
	addr: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
	poolId: 3n,
	risk: 2n,
	metaEvidence: "bafkreigevjrhjw5aiorpijqrge6pwlmcgbdupdkfrq5qqflcsh7beijmny"
});