// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
	constructor() ERC20("MockUSDC", "MUSDC") { }

	function decimals() public pure override returns (uint8) {
		return 6;
	}

	function mint(address to, uint256 amount) public {
			_mint(to, amount);
	}
}
