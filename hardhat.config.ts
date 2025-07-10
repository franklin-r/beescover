import { HardhatUserConfig } from "hardhat/config";
import 'hardhat-gas-reporter';
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
		version: "0.8.28",
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
	networks: {
    hardhat: {
      forking: {
        url: SEPOLIA_RPC_URL,
        blockNumber: 8792436
      },
			initialBaseFeePerGas: 0
    },
		sepolia: {
			url: SEPOLIA_RPC_URL,
			accounts: [`0x${PRIVATE_KEY}`],
			chainId: 11155111
		},
		localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    }
  },
	etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
	mocha: {
		timeout: 60000
	}
};

export default config;