// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFund} from "./interfaces/IFund.sol";
import {IWhitelists} from "./interfaces/IWhitelists.sol";
import {Types} from "./types/Types.sol";

/// @title Fund Contract
/// @notice Manages fund that can be transfered to whitelisted targets
///					This contract requires post-deployment configuration:
///					- Grant FUND_ADMIN_ROLE to the InsurancePools for reserve fund
contract Fund is IFund, AccessControl {
	bytes32 public constant FUND_ADMIN_ROLE = keccak256("FUND_ADMIN_ROLE");
	IWhitelists immutable whitelists;
	Types.FundType public immutable fundType;

	constructor(Types.FundType _fundType, IWhitelists _whitelists) {
		require(!(_fundType > Types.FundType.Treasury), InvalidFundType());
		_setRoleAdmin(FUND_ADMIN_ROLE, FUND_ADMIN_ROLE);
		_grantRole(FUND_ADMIN_ROLE, msg.sender);
		whitelists = _whitelists;
		fundType = _fundType;
	}

	receive() external payable {}

	/// @inheritdoc IFund
	function transferFund(address _to, address _asset, uint256 _valueETH, uint256 _valueERC20)
		external onlyRole(FUND_ADMIN_ROLE)
	{
		Types.WhitelistType wlType = 	fundType == Types.FundType.Reserve 	?
																	Types.WhitelistType.Reserve 				:
																	Types.WhitelistType.Treasury;

		require(whitelists.isAddressWhitelisted(_to, wlType), TargetNotWhitelisted(_to));
		require(whitelists.isAddressWhitelisted(_asset, Types.WhitelistType.Asset), AssetNotWhitelisted(_asset));
		
		if (_valueETH > 0) {
			(bool success, ) = _to.call{value: _valueETH}("");
			require(success, ETHTransferFundFailed(_to, _valueETH));
			emit ETHTransferedFund(_to, _valueETH);
		}
		if (_asset != address(0) && _valueERC20 > 0) {
			IERC20(_asset).transfer(_to, _valueERC20);
			emit ERC20TransferedFund(_to, _asset, _valueERC20);
		}
	}
}
