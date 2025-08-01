/**
 * @authors: [@ferittuncer, @hbarcelos]
 * @reviewers: [@remedcu]
 * @auditors: []
 * @bounties: []
 * @deployments: []
 * SPDX-License-Identifier: MIT
 * From: https://github.com/kleros/erc-792/blob/master/contracts/IArbitrable.sol: commit 5045974c929a9764ca25678f765f7f59b4638a0e
 */
pragma solidity 0.8.28;

import {IArbitrator} from "./IArbitrator.sol";

/**
 * @title IArbitrable
 * Arbitrable interface.
 * When developing arbitrable contracts, we need to:
 * - Define the action taken when a ruling is received by the contract.
 * - Allow dispute creation. For this a function must call arbitrator.createDispute{value: _fee}(_choices,_extraData);
 */
interface IArbitrable {
	/**
		* @dev To be raised when a ruling is given.
		* @param _arbitrator The arbitrator giving the ruling.
		* @param _disputeID ID of the dispute in the Arbitrator contract.
		* @param _ruling The ruling which was given.
		*/
	event Ruling(IArbitrator indexed _arbitrator, uint256 indexed _disputeID, uint256 _ruling);

	/**
		* @dev Give a ruling for a dispute. Must be called by the arbitrator.
		* The purpose of this function is to ensure that the address calling it has the right to rule on the contract.
		* @param _disputeID ID of the dispute in the Arbitrator contract.
		* @param _ruling Ruling given by the arbitrator. Note that 0 is reserved for "Not able/wanting to make a decision".
		*/
	function rule(uint256 _disputeID, uint256 _ruling) external;
}