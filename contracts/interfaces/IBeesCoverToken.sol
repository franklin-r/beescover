// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

interface IBeesCoverToken is IERC20, IAccessControl {
	/// @notice Minter-only function to mint tokens
	function mint(address to, uint256 amount) external;

	/// @notice Burns tokens from msg.sender
	function burn(uint256 amount) external;

	/// @notice Burns tokens from another address (with allowance)
	function burnFrom(address account, uint256 amount) external;

	/// @notice EIP-2612: Permit-based approval
	function permit(
			address owner,
			address spender,
			uint256 value,
			uint256 deadline,
			uint8 v,
			bytes32 r,
			bytes32 s
	) external;

	/// @notice Returns the current nonce for an address (used for permit & voting)
	function nonces(address owner) external view returns (uint256);

	/// @notice EIP-712 domain separator for signature-based functions
	function DOMAIN_SEPARATOR() external view returns (bytes32);
}
