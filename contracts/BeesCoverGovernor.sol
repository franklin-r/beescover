// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorTimelockControl} from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title BeesCoverGovernor
/// @notice This contract requires post-deployment configuration:
///					- Grant PROPOSER_ROLE of the associated TimelockController to this contract
///					- Grant EXECUTOR_ROLE the special zero address
///					- Optionally, grant DEFAULT_ADMIN_ROLE, that can revoke the previous roles, to an admin
///						to ease the setup process, but he should renounce his role as soon as possible.
contract BeesCoverGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl {
	constructor(IVotes _token, TimelockController _timelock)
		Governor("BeesCoverGovernor")
		GovernorSettings(50400 /* 1 week */, 50400 /* 1 week */, 50000e18)
		GovernorVotes(_token)
		GovernorVotesQuorumFraction(4)
		GovernorTimelockControl(_timelock)
	{}

	// The following functions are overrides required by Solidity.

	function state(uint256 proposalId)
		public
		view
		override(Governor, GovernorTimelockControl)
		returns (ProposalState)
	{
		return super.state(proposalId);
	}

	function proposalNeedsQueuing(uint256 proposalId)
		public
		view
		override(Governor, GovernorTimelockControl)
		returns (bool)
	{
		return super.proposalNeedsQueuing(proposalId);
	}

	function proposalThreshold()
		public
		view
		override(Governor, GovernorSettings)
		returns (uint256)
	{
		return super.proposalThreshold();
	}

	function _queueOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
		internal
		override(Governor, GovernorTimelockControl)
		returns (uint48)
	{
		return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
	}

	function _executeOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
		internal
		override(Governor, GovernorTimelockControl)
	{
		super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
	}

	function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
		internal
		override(Governor, GovernorTimelockControl)
		returns (uint256)
	{
		return super._cancel(targets, values, calldatas, descriptionHash);
	}

	function _executor()
		internal
		view
		override(Governor, GovernorTimelockControl)
		returns (address)
	{
		return super._executor();
	}
}
