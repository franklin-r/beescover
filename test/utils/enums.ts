export enum WhitelistType {
  Asset = 0,
  Reserve = 1,
  Treasury = 2
}

export enum FundType {
	Reserve = 0,
	Treasury = 1
}

export enum CoverageStatus {
	Active = 0,
	Claimed = 1,
	PaidOut = 2,
	Expired = 3
}

export type CoverageInfo = {
	value: bigint;
	startTimestamp: bigint;
	endTimestamp: bigint;
	status: CoverageStatus;
	insured: string;
	poolId: bigint;
}