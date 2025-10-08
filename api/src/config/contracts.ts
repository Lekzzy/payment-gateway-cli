import { ethers, Contract, providers, Wallet } from "ethers";
import logger from "../utils/logger";

// Contract ABIs (these will be generated from your compiled contracts)
const PlanRegistryABI = require("../../artifacts/contracts/PlanRegistry.sol/PlanRegistry.json");
const SubscriptionRegistryABI = require("../../artifacts/contracts/SubscriptionRegistry.sol/SubscriptionRegistry.json");
const ChargeProcessorABI = require("../../artifacts/contracts/ChargeProcessor.sol/ChargeProcessor.json");

interface ContractAddresses {
  planRegistry: string;
  subscriptionRegistry: string;
  chargeProcessor: string;
}

interface DeploymentInfo {
  contracts: ContractAddresses;
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
}

class ContractManager {
  private provider: providers.JsonRpcProvider | null = null;
  private wallet: Wallet | null = null;
  private contracts: { [key: string]: Contract } = {};
  private contractAddresses: ContractAddresses | null = null;
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      // Initialize provider
      const rpcUrl = process.env.RPC_URL || process.env.AMOY_RPC_URL;
      if (!rpcUrl) {
        throw new Error(
          "RPC_URL or AMOY_RPC_URL must be set in environment variables"
        );
      }

      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Initialize wallet if private key is provided
      const privateKey =
        process.env.PRIVATE_KEY || process.env.AMOY_PRIVATE_KEY;
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        logger.info("Wallet initialized with private key");
      } else {
        logger.warn("No private key provided - read-only operations only");
      }

      // Load contract addresses from deployment
      await this.loadContractAddresses();

      // Initialize contracts
      this.initializeContracts();

      this.initialized = true;
      logger.info("Contract manager initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize contract manager:", error);
      throw error;
    }
  }

  private async loadContractAddresses(): Promise<void> {
    try {
      const fs = require("fs");
      const path = require("path");
      const deploymentsDir = path.join(__dirname, "../../deployments");

      if (!fs.existsSync(deploymentsDir)) {
        throw new Error(
          "Deployments directory not found. Please deploy contracts first."
        );
      }

      const files = fs.readdirSync(deploymentsDir);
      const deploymentFiles = files.filter((file: string) =>
        file.endsWith(".json")
      );

      if (deploymentFiles.length === 0) {
        throw new Error(
          "No deployment files found. Please deploy contracts first."
        );
      }

      // Get the most recent deployment file
      const latestDeployment = deploymentFiles.sort().pop();
      const deploymentPath = path.join(deploymentsDir, latestDeployment);
      const deployment: DeploymentInfo = JSON.parse(
        fs.readFileSync(deploymentPath, "utf8")
      );

      this.contractAddresses = deployment.contracts;
      logger.info(
        "Contract addresses loaded from deployment file:",
        latestDeployment
      );
    } catch (error) {
      logger.error("Failed to load contract addresses:", error);
      throw error;
    }
  }

  private initializeContracts(): void {
    if (!this.contractAddresses) {
      throw new Error("Contract addresses not loaded");
    }

    // Initialize PlanRegistry
    this.contracts.planRegistry = new ethers.Contract(
      this.contractAddresses.planRegistry,
      PlanRegistryABI.abi,
      this.wallet || this.provider || undefined
    );

    // Initialize SubscriptionRegistry
    this.contracts.subscriptionRegistry = new ethers.Contract(
      this.contractAddresses.subscriptionRegistry,
      SubscriptionRegistryABI.abi,
      this.wallet || this.provider || undefined
    );

    // Initialize ChargeProcessor
    this.contracts.chargeProcessor = new ethers.Contract(
      this.contractAddresses.chargeProcessor,
      ChargeProcessorABI.abi,
      this.wallet || this.provider || undefined
    );

    logger.info("Contracts initialized successfully");
  }

  getContract(name: string): Contract {
    if (!this.initialized) {
      throw new Error("Contract manager not initialized");
    }

    if (!this.contracts[name]) {
      throw new Error(`Contract ${name} not found`);
    }

    return this.contracts[name];
  }

  getProvider(): providers.JsonRpcProvider | null {
    return this.provider;
  }

  getWallet(): Wallet | null {
    return this.wallet;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
const contractManager = new ContractManager();

export default contractManager;
