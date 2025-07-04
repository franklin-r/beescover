// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

interface ILPToken is IERC20, IAccessControl {
	/// @notice Minter-only function to mint tokens
	function mint(address to, uint256 amount) external;

	/// @notice Burns tokens from msg.sender
	function burn(uint256 amount) external;

	/// @notice Burns tokens from another address (with allowance)
	function burnFrom(address account, uint256 amount) external;
}
