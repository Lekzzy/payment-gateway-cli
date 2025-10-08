export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  gasPrice?: string;
  gasLimit?: number;
  confirmations: number;
  timeout: number;
  etherscanApiKey?: string;
}

export const networks: Record<string, NetworkConfig> = {
  hardhat: {
    name: "hardhat",
    chainId: 31337,
    rpcUrl: "http://localhost:8545",
    confirmations: 1,
    timeout: 300000,
  },
  amoy: {
    name: "amoy",
    chainId: 80002,
    rpcUrl: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
    gasPrice: "20000000000", // 20 gwei
    gasLimit: 5000000,
    confirmations: 2,
    timeout: 300000,
    etherscanApiKey: process.env.POLYGONSCAN_API_KEY,
  },
  polygon: {
    name: "polygon",
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    gasPrice: "30000000000", // 30 gwei
    gasLimit: 5000000,
    confirmations: 5,
    timeout: 300000,
    etherscanApiKey: process.env.POLYGONSCAN_API_KEY,
  },
};

export const deploymentConfig = {
  trustedSigner: process.env.TRUSTED_SIGNER || "",
  platformTreasury: process.env.PLATFORM_TREASURY || "",
  platformFeeBps: parseInt(process.env.PLATFORM_FEE_BPS || "100"),
  gasPrice: process.env.GAS_PRICE || "20000000000",
  gasLimit: parseInt(process.env.GAS_LIMIT || "5000000"),
  confirmations: parseInt(process.env.CONFIRMATIONS || "1"),
  timeout: parseInt(process.env.TIMEOUT || "300000"),
};
