// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

/// @title IFund
/// @notice Interface for the Fund contract, responsible for managing
///					authorized target contracts and transferring funds.
interface IFund {
	/// @notice Emitted when a new target address is added to the whitelist.
	/// @param _target The address that has been whitelisted.
	event TargetWhitelisted(address indexed _target);

	/// @notice Emitted when ETH are successfully transfered to a target contract.
	/// @param _to The recipient contract address.
	/// @param _valueETH The amount of ETH transfered.
	event ETHTransferedFund(address indexed _to, uint256 _valueETH);

	/// @notice Emitted when ERC20 tokens are successfully transfered to a target contract.
	/// @param _to The recipient contract address.
	/// @param _asset ERC20 token transfered.
	/// @param _valueERC20 The amount of ERC20 tokens transfered.
	event ERC20TransferedFund(address indexed _to, address _asset, uint256 _valueERC20);

	/// @notice Thrown when an ETH transfer fails.
	/// @param _to The address of the target contract.
	/// @param _valueETH The amount of ETH attempted to transfer.
	error ETHTransferFundFailed(address _to, uint256 _valueETH);

	/// @notice Thrown when trying to interact with an ERC20 contract that is not whitelisted.
	/// @param _asset The address that is not authorized.
	error AssetNotWhitelisted(address _asset);

	/// @notice Thrown when trying to interact with a target that is not whitelisted.
	/// @param _target The address that is not authorized.
	error TargetNotWhitelisted(address _target);

	/// @notice Thrown when the fund type provided doesn't match those available
	error InvalidFundType();

	/// @notice Transfers funds to a whitelisted contract.
	/// @param _to The address of the target contract.
	/// @param _asset ERC20 token to transfer (can be 0 address).
	/// @param _valueETH The amount of ETH to transfer (can be 0).
	/// @param _valueERC20 The amount of ERC20 tokens to transfer (can be 0).
	/// @dev Reverts if the target is not whitelisted or the call fails.
	///			 Caller should ensure both _value* aren't 0.
	function transferFund(address _to, address _asset, uint256 _valueETH, uint256 _valueERC20) external;
}
