// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Types} from "./types/Types.sol";
import {ICoverageProof} from "./interfaces/ICoverageProof.sol";

/// @title CoverageProof
/// @notice This contract requires post-deployment configuration:
///					- Grant COVERAGE_PROOF_ADMIN_ROLE to every new insurance pool deployed.
contract CoverageProof is ICoverageProof, ERC721, ERC721Enumerable, AccessControl {
	bytes32 public constant COVERAGE_PROOF_ADMIN_ROLE = keccak256("COVERAGE_PROOF_ADMIN_ROLE");
	uint256 private nextTokenId;
	mapping (uint256 => Types.CoverageInfo) public coverageInfos;

	constructor()
		ERC721("BeesCoverCoverageProof", "BEECC")
	{
		_setRoleAdmin(COVERAGE_PROOF_ADMIN_ROLE, COVERAGE_PROOF_ADMIN_ROLE);
		_grantRole(COVERAGE_PROOF_ADMIN_ROLE, msg.sender);
	}

	/// @inheritdoc ICoverageProof
	function safeMint(address _to, uint256 _value, uint256 _duration, uint256 _poolId)
		external
		onlyRole(COVERAGE_PROOF_ADMIN_ROLE)
		returns (uint256)
	{
		uint256 tokenId = nextTokenId++;
		uint256 startTimestamp = block.timestamp;
		uint256 endTimestamp = block.timestamp + _duration;
		coverageInfos[tokenId] = Types.CoverageInfo(
			_value,
			startTimestamp,
			endTimestamp,
			_poolId,
			Types.CoverageStatus.Active,
			_to
		);
		_safeMint(_to, tokenId);
		emit CoverageProofMinted(_to, _value, startTimestamp, endTimestamp, tokenId, _poolId);
		return tokenId;
	}

	/// @inheritdoc ICoverageProof
	function setValue(uint256 _tokenId, uint256 _value)
		external
		onlyRole(COVERAGE_PROOF_ADMIN_ROLE)
	{
		uint256 oldValue = coverageInfos[_tokenId].value;
		coverageInfos[_tokenId].value = _value;
		if (_value == 0) {
			_setCoverageStatus(_tokenId, Types.CoverageStatus.Claimed);
		}
		emit CoveredValueUpdated(_tokenId, oldValue, _value);
	}

	/// @inheritdoc ICoverageProof
	function extendDuration(uint256 _tokenId, uint256 _duration)
		external
		onlyRole(COVERAGE_PROOF_ADMIN_ROLE)
	{
		require(_duration > 0, ZeroDurationNotAllowed());
		uint256 oldEndTimestamp = coverageInfos[_tokenId].endTimestamp;
		uint256 newEndTimeStamp = oldEndTimestamp + _duration;
		coverageInfos[_tokenId].endTimestamp = newEndTimeStamp;
		emit CoverageDurationExtended(_tokenId, oldEndTimestamp, newEndTimeStamp);
	}

	/// @inheritdoc ICoverageProof
	function setCoverageStatus(uint256 _tokenId, Types.CoverageStatus _status)
		external
		onlyRole(COVERAGE_PROOF_ADMIN_ROLE)
	{
		_setCoverageStatus(_tokenId, _status);
	}

	/// @inheritdoc ICoverageProof
	function getCoverageInfos(uint256 _tokenId) external view returns (Types.CoverageInfo memory){
		return coverageInfos[_tokenId];
	}

	function ownerOf(uint256 tokenId)
		public
		view
		override(ICoverageProof, ERC721, IERC721)
		returns (address)
	{
		return super.ownerOf(tokenId);
	}

	function _setCoverageStatus(uint256 _tokenId, Types.CoverageStatus _status) internal {
		Types.CoverageStatus oldStatus = coverageInfos[_tokenId].status;
		require(oldStatus != Types.CoverageStatus.Expired, CoverageAlreadyExpired(_tokenId));
		coverageInfos[_tokenId].status = _status;
		emit CoverageStatusUpdated(_tokenId, oldStatus, _status);
	}

	// The following functions are overrides required by Solidity.

	function _update(address to, uint256 tokenId, address auth)
		internal
		override(ERC721, ERC721Enumerable)
		returns (address)
	{
		return super._update(to, tokenId, auth);
	}

	function _increaseBalance(address account, uint128 value)
		internal
		override(ERC721, ERC721Enumerable)
	{
		super._increaseBalance(account, value);
	}

	function supportsInterface(bytes4 interfaceId)
		public
		view
		override(ERC721, ERC721Enumerable, AccessControl)
		returns (bool)
	{
		return super.supportsInterface(interfaceId);
	}
}