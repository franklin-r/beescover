// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title LPToken
/// @notice This contract is meant to be deployed only by the InsurancePool
///					that will use it.
contract LPToken is ERC20, ERC20Burnable, AccessControl, ERC20Permit {
	/// @notice Error thrown when trying to transfer the token
	error NonTransferableToken();

	bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

	constructor(string memory name, string memory symbol)
		ERC20(name, symbol)
		ERC20Permit(name)
	{
		_setRoleAdmin(MINTER_ROLE, MINTER_ROLE);
		_grantRole(MINTER_ROLE, msg.sender);
	}

	function decimals() public pure override returns (uint8) {
		return 6;
	}

	function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
		_mint(to, amount);
	}

	function transfer(address, uint256) public pure override returns (bool) {
    revert NonTransferableToken();
	}

	function transferFrom(address, address, uint256) public pure override returns (bool) {
			revert NonTransferableToken();
	}
}