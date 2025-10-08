import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import { networks } from "./config/deployment.config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    amoy: {
      url: networks.amoy.rpcUrl,
      accounts: process.env.AMOY_PRIVATE_KEY
        ? [process.env.AMOY_PRIVATE_KEY]
        : [],
      gasPrice: parseInt(networks.amoy.gasPrice || "20000000000"),
      gas: networks.amoy.gasLimit,
      chainId: networks.amoy.chainId,
    },
    polygon: {
      url: networks.polygon.rpcUrl,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: parseInt(networks.polygon.gasPrice || "30000000000"),
      gas: networks.polygon.gasLimit,
      chainId: networks.polygon.chainId,
    },
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      amoy: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
