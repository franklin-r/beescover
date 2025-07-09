// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import {IArbitrable} from "../interfaces/IArbitrable.sol";

/// @title Types
/// @notice Contains shared enum types used across the protocol
library Types {
	/// @notice Represents the type of whitelist used in the protocol
	/// @dev Used to distinguish between different whitelist mappings in contracts
	enum WhitelistType {
		/// @notice Represents a whitelisted asset (e.g. ERC20 tokens)
		Asset,
		/// @notice Represents a whitelisted transfer target for the reserve fund (e.g. insurance pool)
		Reserve,
		/// @notice Represents a whitelisted transfer target for the treasury fund (e.g. ramp down account)
		Treasury,
		/// @notice Represents a whitelisted pool we can interact with for supply
		Pool
	}

	/// @notice Represents the types of fund used in the protocol
	enum FundType {
		/// @notice Represents a reserve fund (for insurance pools)
		Reserve,
		/// @notice Represents a treasury fund (for fees collection)
		Treasury
	}

	/// @notice Enum representing the possible statuses of a coverage.
	enum CoverageStatus {
		/// The coverage is active and valid.
		Active,
		/// A claim has been made.
		Claimed,
		/// The claim has been fulfilled.
		PaidOut,
		/// The coverage has expired without a claim.
		Expired
	}

	/// @notice Struct representing metadata of a specific coverage NFT.
	/// @param value Covered value in ERC20 token bits.
	/// @param startTimestamp Timestamp when the coverage starts.
	/// @param endTimestamp Timestamp when the coverage ends.
	/// @param status Current status of the coverage.
	/// @param insured Address of the insured party.
	/// @param poolId Identifier of the associated liquidity pool.
	struct CoverageInfo {
		uint256 value;
		uint256 startTimestamp;
		uint256 endTimestamp;
		uint256 poolId;
		CoverageStatus status;
		address insured;
	}

	/// @notice Enum representing the possible statuses of a dispute.
	enum DisputeStatus {
		/// The dispute is waiting for ruling.
		Waiting,
		/// The dispute is appealable.
		Appealable,
		/// The dispute is solved.
		Solved
	}

	/// @notice Struct representing metadata of a specific dispute.
	/// @param arbitrated The contract asking for arbitration.
	/// @param choices The number of choices possible for the ruling.
	/// @param ruling The current ruling for the dispute.
	/// @param status The current status of the dispute.
	/// @param appealPeriodStart Timestamp of the beginning of the appeal period.
	/// @param appealPeriodStart Timestamp of the end of the appeal period.
	/// @param appealCount Number of appeal already made for this dispute.
	struct Dispute {
		IArbitrable arbitrated;
		uint256 choices;
		uint256 ruling;
		DisputeStatus status;
		uint256 appealPeriodStart;
		uint256 appealPeriodEnd;
		uint256 appealCount;
	}
}