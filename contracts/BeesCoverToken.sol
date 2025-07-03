// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title BeesCoverToken
/// @notice This token contract requires post-deployment configuration:
///					- Grant MINTER_ROLE to every new insurance pool deployed.
contract BeesCoverToken is ERC20, ERC20Burnable, AccessControl, ERC20Permit, ERC20Votes {
	bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

	constructor(address recipient)
		ERC20("BeesCoverToken", "BEE")
		ERC20Permit("BeesCoverToken")
	{
		_mint(recipient, 100000000 * 10 ** decimals());
		_setRoleAdmin(MINTER_ROLE, MINTER_ROLE);
		_grantRole(MINTER_ROLE, msg.sender);
	}

	function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
		_mint(to, amount);
	}

	// The following functions are overrides required by Solidity.

	function _update(address from, address to, uint256 value)
		internal
		override(ERC20, ERC20Votes)
	{
		super._update(from, to, value);
	}

	function nonces(address owner)
		public
		view
		override(ERC20Permit, Nonces)
		returns (uint256)
	{
		return super.nonces(owner);
	}
}
