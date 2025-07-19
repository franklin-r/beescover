import { Asset } from "./helpers";

export enum Network {
	FORK = 0,
	SEPOLIA = 1
}

// Chnage config here
export const deploymentAsset = Asset.USDC;
export const deploymentNetwork = Network.FORK;

export type DeploymentConfig = {
	network: Network;
	asset: Asset;
}

export const deploymentConfig = {
	network: deploymentNetwork,
	asset: deploymentAsset,
}

export function getDeploymentKey(config: DeploymentConfig): string {
  return `${config.network}-${config.asset}`;
}

export const adminAddresses = new Map<string, string>();
adminAddresses.set(getDeploymentKey({network: Network.FORK, asset: Asset.USDC}), "0xBBFB60a1d4e16c932B1546C9136AAd0D89f9f834");
adminAddresses.set(getDeploymentKey({network: Network.FORK, asset: Asset.WBTC}), "0x55513116E735FDCcDF7EFD25B74ED5E33465a3b2");
adminAddresses.set(getDeploymentKey({network: Network.FORK, asset: Asset.EURS}), "0xdD5De55eA6804EFb283f43b0C091C25000a6486c");
adminAddresses.set(getDeploymentKey({network: Network.FORK, asset: Asset.USDT}), "0xBBFB60a1d4e16c932B1546C9136AAd0D89f9f834");
adminAddresses.set(getDeploymentKey({network: Network.SEPOLIA, asset: Asset.USDC}), "0x5941fd401ec7580c77ac31E45c9f59436a2f8C1b");
adminAddresses.set(getDeploymentKey({network: Network.SEPOLIA, asset: Asset.WBTC}), "0x5941fd401ec7580c77ac31E45c9f59436a2f8C1b");
adminAddresses.set(getDeploymentKey({network: Network.SEPOLIA, asset: Asset.EURS}), "0x5941fd401ec7580c77ac31E45c9f59436a2f8C1b");
adminAddresses.set(getDeploymentKey({network: Network.SEPOLIA, asset: Asset.USDT}), "0x5941fd401ec7580c77ac31E45c9f59436a2f8C1b");