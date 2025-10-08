import "dotenv/config";
import { ethers } from "hardhat";
import { Contract } from "ethers";

interface DeploymentConfig {
  planRegistry: string;
  subscriptionRegistry: string;
  chargeProcessor: string;
  trustedSigner?: string;
  platformTreasury?: string;
  platformFeeBps?: number;
}

async function main() {
  console.log("🚀 Starting deployment of Crypto Subscription contracts...\n");

  let [defaultSigner] = await ethers.getSigners();
  let deployer: any = defaultSigner;

  if (!deployer) {
    const { Wallet, providers, utils } = require("ethers");
    const privateKey = process.env.AMOY_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        "No signer available. Set AMOY_PRIVATE_KEY or PRIVATE_KEY in your environment."
      );
    }
    const provider = ethers.provider;
    deployer = new Wallet(privateKey, provider);
  }

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

  // Check if we have enough balance
  const balance = await deployer.getBalance();
  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    throw new Error("Insufficient balance for deployment");
  }

  const deploymentConfig: DeploymentConfig = {
    planRegistry: "",
    subscriptionRegistry: "",
    chargeProcessor: "",
    trustedSigner: process.env.TRUSTED_SIGNER || deployer.address,
    platformTreasury: process.env.PLATFORM_TREASURY || deployer.address,
    platformFeeBps: parseInt(process.env.PLATFORM_FEE_BPS || "100") // 1% default
  };

  try {
    // Set higher gas price for faster confirmation on testnets
    const gasPrice = ethers.utils.parseUnits("60", "gwei"); // 60 gwei
    console.log("Using gas price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");

    // 1. Deploy PlanRegistry
    console.log("\n📋 Deploying PlanRegistry...");
    const PlanRegistry = await ethers.getContractFactory("PlanRegistry", deployer);
    const planRegistry = await PlanRegistry.deploy({
      gasPrice: gasPrice
    });
    await planRegistry.deployed();
    deploymentConfig.planRegistry = planRegistry.address;
    console.log("✅ PlanRegistry deployed at:", planRegistry.address);

    // 2. Deploy SubscriptionRegistry
    console.log("\n📝 Deploying SubscriptionRegistry...");
    const SubscriptionRegistry = await ethers.getContractFactory("SubscriptionRegistry", deployer);
    const subscriptionRegistry = await SubscriptionRegistry.deploy(planRegistry.address, {
      gasPrice: gasPrice
    });
    await subscriptionRegistry.deployed();
    deploymentConfig.subscriptionRegistry = subscriptionRegistry.address;
    console.log("✅ SubscriptionRegistry deployed at:", subscriptionRegistry.address);

    // 3. Deploy ChargeProcessor
    console.log("\n💳 Deploying ChargeProcessor...");
    const ChargeProcessor = await ethers.getContractFactory("ChargeProcessor", deployer);
    const chargeProcessor = await ChargeProcessor.deploy(
      subscriptionRegistry.address,
      planRegistry.address,
      {
        gasPrice: gasPrice
      }
    );
    await chargeProcessor.deployed();
    deploymentConfig.chargeProcessor = chargeProcessor.address;
    console.log("✅ ChargeProcessor deployed at:", chargeProcessor.address);

    // 4. Initialize contracts
    console.log("\n⚙️  Initializing contracts...");

    // Set ChargeProcessor in SubscriptionRegistry
    console.log("Setting ChargeProcessor in SubscriptionRegistry...");
    await subscriptionRegistry.setChargeProcessor(chargeProcessor.address);
    console.log("✅ ChargeProcessor set in SubscriptionRegistry");

    // Set trusted signer
    if (deploymentConfig.trustedSigner) {
      console.log("Setting trusted signer...");
      await chargeProcessor.setTrustedSigner(deploymentConfig.trustedSigner);
      console.log("✅ Trusted signer set to:", deploymentConfig.trustedSigner);
    }

    // Set platform treasury and fee
    console.log("Setting platform treasury and fee...");
    await chargeProcessor.setPlatformTreasury(deploymentConfig.platformTreasury!);
    await chargeProcessor.setPlatformFee(deploymentConfig.platformFeeBps!);
    console.log("✅ Platform treasury set to:", deploymentConfig.platformTreasury);
    console.log("✅ Platform fee set to:", deploymentConfig.platformFeeBps, "bps");

    // 5. Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Verify PlanRegistry
    const planRegistryOwner = await planRegistry.owner();
    console.log("PlanRegistry owner:", planRegistryOwner);

    // Verify SubscriptionRegistry
    const subRegistryOwner = await subscriptionRegistry.owner();
    const subRegistryChargeProcessor = await subscriptionRegistry.chargeProcessor();
    console.log("SubscriptionRegistry owner:", subRegistryOwner);
    console.log("SubscriptionRegistry ChargeProcessor:", subRegistryChargeProcessor);

    // Verify ChargeProcessor
    const chargeProcessorOwner = await chargeProcessor.owner();
    const chargeProcessorTrustedSigner = await chargeProcessor.trustedSigner();
    const chargeProcessorPlatformTreasury = await chargeProcessor.platformTreasury();
    const chargeProcessorPlatformFee = await chargeProcessor.platformFeeBps();
    console.log("ChargeProcessor owner:", chargeProcessorOwner);
    console.log("ChargeProcessor trusted signer:", chargeProcessorTrustedSigner);
    console.log("ChargeProcessor platform treasury:", chargeProcessorPlatformTreasury);
    console.log("ChargeProcessor platform fee:", chargeProcessorPlatformFee.toString(), "bps");

    // 6. Save deployment info
    console.log("\n💾 Saving deployment configuration...");
    const deploymentInfo = {
      network: (await ethers.provider.getNetwork()).name,
      chainId: (await ethers.provider.getNetwork()).chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deploymentConfig
    };

    console.log("\n📄 Deployment Summary:");
    console.log("====================");
    console.log("Network:", deploymentInfo.network);
    console.log("Chain ID:", deploymentInfo.chainId);
    console.log("Deployer:", deploymentInfo.deployer);
    console.log("Timestamp:", deploymentInfo.timestamp);
    console.log("\nContract Addresses:");
    console.log("PlanRegistry:", deploymentConfig.planRegistry);
    console.log("SubscriptionRegistry:", deploymentConfig.subscriptionRegistry);
    console.log("ChargeProcessor:", deploymentConfig.chargeProcessor);
    console.log("Trusted Signer:", deploymentConfig.trustedSigner);
    console.log("Platform Treasury:", deploymentConfig.platformTreasury);
    console.log("Platform Fee:", deploymentConfig.platformFeeBps, "bps");

    // Save to file
    const fs = require('fs');
    const path = require('path');
    const deploymentsDir = path.join(__dirname, '..', 'deployments'); // root-level deployments/
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const filename = `deployment-${deploymentInfo.network}-${Date.now()}.json`;
    const filepath = path.join(deploymentsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${filepath}`);

    // Duplicate the deployment info to API's expected directory: api/deployments/
    const apiDeploymentsDir = path.join(__dirname, '..', 'api', 'deployments');
    if (!fs.existsSync(apiDeploymentsDir)) {
      fs.mkdirSync(apiDeploymentsDir, { recursive: true });
    }
    const apiDeploymentPath = path.join(apiDeploymentsDir, filename);
    fs.writeFileSync(apiDeploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info also saved to API: ${apiDeploymentPath}`);

    // Copy ABIs to API so it can require('../../artifacts/...')
    const srcArtifactsBase = path.join(__dirname, '..', 'artifacts', 'contracts');
    const dstArtifactsBase = path.join(__dirname, '..', 'api', 'artifacts', 'contracts');
    const artifactsToCopy = [
      { subdir: 'PlanRegistry.sol', file: 'PlanRegistry.json' },
      { subdir: 'SubscriptionRegistry.sol', file: 'SubscriptionRegistry.json' },
      { subdir: 'ChargeProcessor.sol', file: 'ChargeProcessor.json' },
    ];
    for (const a of artifactsToCopy) {
      const srcDir = path.join(srcArtifactsBase, a.subdir);
      const dstDir = path.join(dstArtifactsBase, a.subdir);
      if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
      }
      const src = path.join(srcDir, a.file);
      const dst = path.join(dstDir, a.file);
      if (!fs.existsSync(src)) {
        console.warn(`⚠️ ABI not found at ${src}. Did you run compile?`);
      } else {
        fs.copyFileSync(src, dst);
        console.log(`📦 Copied ABI to API: ${path.relative(path.join(__dirname, '..'), dst)}`);
      }
    }

    console.log("\n🎉 Deployment completed successfully!");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
