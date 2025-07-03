import { HardhatUserConfig } from "hardhat/config";
import 'hardhat-gas-reporter';
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
		version: "0.8.30",
		settings: {
			optimizer: {
				enabled: true,
				runs: 200
			}
		}
	},
	gasReporter: {
    enabled: true,
    token: 'ETH'
  },
};

export default config;
