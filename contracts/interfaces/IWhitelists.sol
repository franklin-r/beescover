// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Types} from "../types/Types.sol";

/// @title IWhitelists
/// @notice Interface for managing multiple whitelists: asset, reserve and treasury
interface IWhitelists {
	/// @notice Emitted when an address is added to a whitelist
	/// @param _addr The address that was added
	/// @param _wlType The whitelist type (Asset, Reserve, Treasury, Pool)
	event AddressAdded(address indexed _addr, Types.WhitelistType _wlType);

	/// @notice Emitted when an address is removed from a whitelist
	/// @param _addr The address that was removed
	/// @param _wlType The whitelist type (Asset, Reserve, Treasury, Pool)
	event AddressRemoved(address indexed _addr, Types.WhitelistType _wlType);

	/// @notice Reverts if the address is the zero address
	error ZeroAddressNotAllowed();

	/// @notice Reverts if the address is already whitelisted
	/// @param _addr The address
	/// @param _wlType The whitelist type
	error AddressAlreadyWhitelisted(address _addr, Types.WhitelistType _wlType);

	/// @notice Reverts if the address is not whitelisted but expected to be
	/// @param _addr The address
	/// @param _wlType The whitelist type
	error AddressAlreadyNotAllowed(address _addr, Types.WhitelistType _wlType);

	/// @notice Reverts if the whitelist type is not valid
	error InvalidWhitelistType();

	/// @notice Adds addresses to the respective whitelists
	/// @param _assets List of asset addresses to whitelist
	/// @param _reserveTargets List of reserve addresses to whitelist
	/// @param _treasuryTargets List of treasury addresses to whitelist
	function add(
		address[] calldata _assets,
		address[] calldata _reserveTargets,
		address[] calldata _treasuryTargets
	) external;

	/// @notice Removes addresses from the respective whitelists
	/// @param _assets List of asset addresses to remove
	/// @param _reserveTargets List of reserve addresses to remove
	/// @param _treasuryTargets List of treasury addresses to remove
	function remove(
		address[] calldata _assets,
		address[] calldata _reserveTargets,
		address[] calldata _treasuryTargets
	) external;

	/// @notice Checks if an address is whitelisted for a given type
	/// @param _addr The address to check
	/// @param _wlType The whitelist type to check against
	/// @return isWhitelisted True if address is whitelisted
	function isAddressWhitelisted(address _addr, Types.WhitelistType _wlType) external view returns (bool);
}

