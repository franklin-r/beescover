// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import {Types} from "../types/Types.sol";

/// @title ICoverageProof
/// @notice Interface for BeesCover's NFT-based insurance coverage proofs.
/// @dev Defines the core events and custom errors emitted by the CoverageProof contract.
interface ICoverageProof {
	/// @notice Emitted when a new coverage NFT is minted.
	/// @param _to Address receiving the NFT.
	/// @param _value Amount of coverage (in ERC20 token bits).
	/// @param startTimestamp Timestamp marking the start of the coverage period.
	/// @param endTimestamp Timestamp marking the end of the coverage period.
	/// @param _tokenId ID of the minted NFT.
	/// @param _poolId ID of the associated coverage pool.
	event CoverageProofMinted(
		address indexed _to,
		uint256 _value,
		uint256 startTimestamp,
		uint256 endTimestamp,
		uint256 indexed _tokenId,
		uint256 indexed _poolId
	);

	/// @notice Emitted when the value of a coverage NFT is updated.
	/// @param _tokenId ID of the NFT.
	/// @param _oldValue Previous covered value.
	/// @param _newValue New covered value.
	event CoveredValueUpdated(
		uint256 indexed _tokenId,
		uint256 _oldValue,
		uint256 _newValue
	);

	/// @notice Emitted when the coverage status of a token is updated.
	/// @param _tokenId ID of the NFT.
	/// @param _oldStatus Previous status of the coverage.
	/// @param _newStatus New status of the coverage.
	event CoverageStatusUpdated(
		uint256 indexed _tokenId,
		Types.CoverageStatus _oldStatus,
		Types.CoverageStatus _newStatus
	);

	/// @notice Emitted when the coverage duration is extended.
	/// @param _tokenId ID of the NFT.
	/// @param _oldEndTimestamp Previous coverage end timestamp.
	/// @param _newEndTimeStamp New coverage end timestamp.
	event CoverageDurationExtended(
		uint256 indexed _tokenId,
		uint256 _oldEndTimestamp,
		uint256 _newEndTimeStamp
	);

	/// @notice Thrown when trying to mint a coverage with zero duration.
	error ZeroDurationNotAllowed();

	/// @notice Thrown when trying to change status of an already expired coverage.
	error CoverageAlreadyExpired(uint256 _tokenId);

	/// @notice Mints a new NFT representing an active insurance coverage.
	/// @dev Only callable by accounts with the COVERAGE_PROOF_ADMIN_ROLE.
	/// @param _to The address receiving the NFT (insured party).
	/// @param _value The value covered by this policy (should be checked by the caller and must be greater than 0).
	/// @param _duration The coverage duration in seconds (should be checked by the caller and must be greater than 0).
	/// @param _poolId Identifier of the coverage pool backing this policy.
	/// @return tokenId The ID of the newly minted NFT.
	function safeMint(address _to, uint256 _value, uint256 _duration, uint256 _poolId) external returns (uint256);

	/// @notice Updates the coverage value of an existing NFT.
	/// @dev If the new value is zero, the coverage status is automatically set to Claimed.
	///      Only callable by accounts with the COVERAGE_PROOF_ADMIN_ROLE role.
	/// @param _tokenId The ID of the NFT to update.
	/// @param _value The new coverage value to assign (must be greater than 0).
	function setValue(uint256 _tokenId, uint256 _value) external;

	/// @notice Updates the status of a coverage (e.g. Active → Claimed).
	/// @dev Coverage status cannot be updated if it's already expired.
	/// @param _tokenId The ID of the NFT whose coverage status is being updated.
	/// @param _status The new status to assign to the coverage.
	function setCoverageStatus(uint256 _tokenId, Types.CoverageStatus _status) external;

	/// @notice Extends the coverage duration of an existing NFT.
	/// @dev Only callable by accounts with the COVERAGE_PROOF_ADMIN_ROLE role.
	/// @param _tokenId The ID of the NFT to update.
	/// @param _duration The extended duration to apply to the coverage (must be greater than 0).
	function extendDuration(uint256 _tokenId, uint256 _duration) external;

	/// @notice Returns the coverage info for a specific coverage proof
	/// @param _tokenId The ID of the NFT to retrieve coverage info from
	/// @return The coverage info of this NFT
	function getCoverageInfos(uint256 _tokenId) external view returns (Types.CoverageInfo memory);

	/// @notice returns the owner of a specified tokenId
	/// @param _tokenId The token ID to find the owner
	/// @return The address of the owner of _tokenID
	function ownerOf(uint256 _tokenId) external view returns (address);
}
