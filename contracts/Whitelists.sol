// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IWhitelists} from "./interfaces/IWhitelists.sol";
import {Types} from "./types/Types.sol";

contract Whitelists is IWhitelists, AccessControl {
	bytes32 public constant WHITELISTS_ADMIN_ROLE = keccak256("WHITELISTS_ADMIN_ROLE");

	mapping (address => bool) public assetWL;
	mapping (address => bool) public reserveWL;
	mapping (address => bool) public treasuryWL;

	constructor() {
		_setRoleAdmin(WHITELISTS_ADMIN_ROLE, WHITELISTS_ADMIN_ROLE);
		_grantRole(WHITELISTS_ADMIN_ROLE, msg.sender);
	}

	function add(
		address[] calldata _assets,
		address[] calldata _reserveTargets,
		address[] calldata _treasuryTargets
	) external onlyRole(WHITELISTS_ADMIN_ROLE) {
		_processWhitelist(_assets, Types.WhitelistType.Asset, true);
		_processWhitelist(_reserveTargets, Types.WhitelistType.Reserve, true);
		_processWhitelist(_treasuryTargets, Types.WhitelistType.Treasury, true);
	}

	function remove(
		address[] calldata _assets,
		address[] calldata _reserveTargets,
		address[] calldata _treasuryTargets
	) external onlyRole(WHITELISTS_ADMIN_ROLE) {
		_processWhitelist(_assets, Types.WhitelistType.Asset, false);
		_processWhitelist(_reserveTargets, Types.WhitelistType.Reserve, false);
		_processWhitelist(_treasuryTargets, Types.WhitelistType.Treasury, false);
	}

	function isAddressWhitelisted(address _addr, Types.WhitelistType _wlType)
		external
		view
		returns (bool)
	{
		mapping (address => bool) storage wl = _getMappingByType(_wlType);
		return wl[_addr];
	}

	/// @notice Internal logic to handle both addition and removal
	function _processWhitelist(
		address[] calldata _addresses,
		Types.WhitelistType _wlType,
		bool _addOp
	) internal {
		mapping (address => bool) storage wl = _getMappingByType(_wlType);
		uint256 n_addresses = _addresses.length;

		for (uint256 i = 0; i < n_addresses; ++i) {
			address addr = _addresses[i];
			require(addr != address(0), ZeroAddressNotAllowed());

			if (_addOp) {
				require(!wl[addr], AddressAlreadyWhitelisted(addr, _wlType));
				wl[addr] = true;
				emit AddressAdded(addr, _wlType);
			} else {
				require(wl[addr], AddressAlreadyNotAllowed(addr, _wlType));
				wl[addr] = false;
				emit AddressRemoved(addr, _wlType);
			}
		}
	}

	/// @notice Internal helper to select correct mapping based on whitelist type
	function _getMappingByType(Types.WhitelistType _wlType)
		internal
		view
		returns(mapping (address => bool) storage)
	{
		if (_wlType == Types.WhitelistType.Asset) {
			return assetWL;
		}
		if (_wlType == Types.WhitelistType.Reserve) {
			return reserveWL;
		}
		if (_wlType == Types.WhitelistType.Treasury) {
			return treasuryWL;
		}
		revert InvalidWhitelistType();
	}
}