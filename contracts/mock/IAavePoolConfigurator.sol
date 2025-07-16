// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

interface IAavePoolConfigurator {
  function setSupplyCap(address asset, uint256 newSupplyCap) external;
}