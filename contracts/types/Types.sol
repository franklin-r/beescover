// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

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
}
