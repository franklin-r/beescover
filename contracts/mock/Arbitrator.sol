/**
 * @authors: [@ferittuncer, @hbarcelos]
 * @reviewers: []
 * @auditors: []
 * @bounties: []
 * @deployments: []
 * SPDX-License-Identifier: MIT
 * Inspired from: https://github.com/kleros/erc-792/blob/master/contracts/examples/CentralizedArbitratorWithAppeal.sol: commit 5045974c929a9764ca25678f765f7f59b4638a0e
 */
pragma solidity 0.8.28;

import {IArbitrator} from "../interfaces/IArbitrator.sol";
import {IArbitrable} from "../interfaces/IArbitrable.sol";
import {Types} from "../types/Types.sol";

contract Arbitrator is IArbitrator {
	/// @notice Reverts when the caller is not the contract owner.
	error NotOwner();

	/// @notice Reverts when the ETH sent is less than the required payment.
	/// @param _available The amount of ETH sent with the transaction.
	/// @param _required The required amount of ETH to proceed.
	error InsufficientPayment(uint256 _available, uint256 _required);

	/// @notice Reverts when a ruling provided is not within the valid range of choices.
	/// @param _ruling The ruling that was attempted to be set.
	/// @param _numberOfChoices The maximum valid ruling number.
	error InvalidRuling(uint256 _ruling, uint256 _numberOfChoices);

	/// @notice Reverts when the dispute is not in the expected status.
	/// @param _current The current status of the dispute.
	/// @param _expected The expected status required for the operation.
	error InvalidStatus(Types.DisputeStatus _current, Types.DisputeStatus _expected);

	/// @notice Reverts when trying to execute a ruling before the appeal period has ended.
	/// @param _currentTime The current block timestamp.
	/// @param _appealPeriodEnd The timestamp marking the end of the appeal period.
	error BeforeAppealPeriodEnd(uint256 _currentTime, uint256 _appealPeriodEnd);

	/// @notice Reverts when attempting to appeal after the appeal period has ended.
	/// @param _currentTime The current block timestamp.
	/// @param _appealPeriodEnd The timestamp marking the end of the appeal period.
	error AfterAppealPeriodEnd(uint256 _currentTime, uint256 _appealPeriodEnd);

	address public owner = msg.sender;
	uint256 constant appealWindow = 3 minutes;
	uint256 internal arbitrationFee = 1e15;

	Types.Dispute[] public disputes;

	function arbitrationCost() public view override returns (uint256) {
		return arbitrationFee;
	}

	function appealCost(uint256 _disputeID) public view override returns (uint256) {
		return arbitrationFee * (2**(disputes[_disputeID].appealCount));
	}

	function setArbitrationCost(uint256 _newCost) public {
		arbitrationFee = _newCost;
	}

	function createDispute(uint256 _choices)
		public
		payable
		override
		returns (uint256 disputeID)
	{
		uint256 requiredAmount = arbitrationCost();
		if (msg.value > requiredAmount) {
			revert InsufficientPayment(msg.value, requiredAmount);
		}

		disputes.push(
			Types.Dispute({
				arbitrated: IArbitrable(msg.sender),
				choices: _choices,
				ruling: 0,
				status: Types.DisputeStatus.Waiting,
				appealPeriodStart: 0,
				appealPeriodEnd: 0,
				appealCount: 0
			})
		);

		disputeID = disputes.length - 1;
		emit DisputeCreation(disputeID, IArbitrable(msg.sender));
	}

	function disputeStatus(uint256 _disputeID) public view override returns (Types.DisputeStatus status) {
		Types.Dispute storage dispute = disputes[_disputeID];
		if (disputes[_disputeID].status == Types.DisputeStatus.Appealable && block.timestamp >= dispute.appealPeriodEnd)
			return Types.DisputeStatus.Solved;
		else return disputes[_disputeID].status;
	}

	function currentRuling(uint256 _disputeID) public view override returns (uint256 ruling) {
		ruling = disputes[_disputeID].ruling;
	}

	function giveRuling(uint256 _disputeID, uint256 _ruling) public {
		if (msg.sender != owner) {
			revert NotOwner();
		}

		Types.Dispute storage dispute = disputes[_disputeID];

		if (_ruling > dispute.choices) {
			revert InvalidRuling(_ruling, dispute.choices);
		}
		if (dispute.status != Types.DisputeStatus.Waiting) {
			revert InvalidStatus(dispute.status, Types.DisputeStatus.Waiting);
		}

		dispute.ruling = _ruling;
		dispute.status = Types.DisputeStatus.Appealable;
		dispute.appealPeriodStart = block.timestamp;
		dispute.appealPeriodEnd = dispute.appealPeriodStart + appealWindow;

		emit AppealPossible(_disputeID, dispute.arbitrated);
	}

	function executeRuling(uint256 _disputeID) public {
		Types.Dispute storage dispute = disputes[_disputeID];
		if (dispute.status != Types.DisputeStatus.Appealable) {
			revert InvalidStatus(dispute.status, Types.DisputeStatus.Appealable);
		}

		if (block.timestamp <= dispute.appealPeriodEnd) {
			revert BeforeAppealPeriodEnd(block.timestamp, dispute.appealPeriodEnd);
		}

		dispute.status = Types.DisputeStatus.Solved;
		dispute.arbitrated.rule(_disputeID, dispute.ruling);
	}

	function appeal(uint256 _disputeID) public payable override {
		Types.Dispute storage dispute = disputes[_disputeID];

		uint256 requiredAmount = appealCost(_disputeID);
		if (msg.value < requiredAmount) {
			revert InsufficientPayment(msg.value, requiredAmount);
		}

		if (dispute.status != Types.DisputeStatus.Appealable) {
			revert InvalidStatus(dispute.status, Types.DisputeStatus.Appealable);
		}

		if (block.timestamp > dispute.appealPeriodEnd) {
			revert AfterAppealPeriodEnd(block.timestamp, dispute.appealPeriodEnd);
		}

		dispute.appealCount++;
		dispute.status = Types.DisputeStatus.Waiting;

		emit AppealDecision(_disputeID, dispute.arbitrated);
	}

	function appealPeriod(uint256 _disputeID) public view override returns (uint256 start, uint256 end) {
		Types.Dispute storage dispute = disputes[_disputeID];

		return (dispute.appealPeriodStart, dispute.appealPeriodEnd);
	}
}