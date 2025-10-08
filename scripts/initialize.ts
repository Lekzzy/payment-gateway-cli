import { ethers } from "hardhat";
import { Contract } from "ethers";

interface DeploymentInfo {
  contracts: {
    planRegistry: string;
    subscriptionRegistry: string;
    chargeProcessor: string;
  };
}

async function main() {
  console.log("⚙️  Starting post-deployment initialization...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Initializing with account:", deployer.address);

  // Read deployment info
  const fs = require('fs');
  const path = require('path');
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  
  if (!fs.existsSync(deploymentsDir)) {
    console.log("❌ No deployments directory found. Please deploy contracts first.");
    return;
  }

  const files = fs.readdirSync(deploymentsDir);
  const deploymentFiles = files.filter((file: string) => file.endsWith('.json'));
  
  if (deploymentFiles.length === 0) {
    console.log("❌ No deployment files found. Please deploy contracts first.");
    return;
  }

  // Get the most recent deployment file
  const latestDeployment = deploymentFiles.sort().pop();
  const deploymentPath = path.join(deploymentsDir, latestDeployment);
  const deployment: DeploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  console.log("📄 Using deployment file:", latestDeployment);

  // Get contract instances
  const PlanRegistry = await ethers.getContractFactory("PlanRegistry");
  const SubscriptionRegistry = await ethers.getContractFactory("SubscriptionRegistry");
  const ChargeProcessor = await ethers.getContractFactory("ChargeProcessor");

  const planRegistry = PlanRegistry.attach(deployment.contracts.planRegistry);
  const subscriptionRegistry = SubscriptionRegistry.attach(deployment.contracts.subscriptionRegistry);
  const chargeProcessor = ChargeProcessor.attach(deployment.contracts.chargeProcessor);

  try {
    // 1. Verify contract connections
    console.log("\n🔗 Verifying contract connections...");
    
    const planRegistryOwner = await planRegistry.owner();
    const subRegistryOwner = await subscriptionRegistry.owner();
    const chargeProcessorOwner = await chargeProcessor.owner();
    
    console.log("✅ PlanRegistry owner:", planRegistryOwner);
    console.log("✅ SubscriptionRegistry owner:", subRegistryOwner);
    console.log("✅ ChargeProcessor owner:", chargeProcessorOwner);

    // 2. Check if ChargeProcessor is set in SubscriptionRegistry
    console.log("\n🔗 Checking ChargeProcessor connection...");
    const currentChargeProcessor = await subscriptionRegistry.chargeProcessor();
    if (currentChargeProcessor === deployment.contracts.chargeProcessor) {
      console.log("✅ ChargeProcessor already set in SubscriptionRegistry");
    } else {
      console.log("⚠️  Setting ChargeProcessor in SubscriptionRegistry...");
      await subscriptionRegistry.setChargeProcessor(deployment.contracts.chargeProcessor);
      console.log("✅ ChargeProcessor set in SubscriptionRegistry");
    }

    // 3. Check platform configuration
    console.log("\n💰 Checking platform configuration...");
    const platformTreasury = await chargeProcessor.platformTreasury();
    const platformFee = await chargeProcessor.platformFeeBps();
    const trustedSigner = await chargeProcessor.trustedSigner();

    console.log("Platform Treasury:", platformTreasury);
    console.log("Platform Fee:", platformFee.toString(), "bps");
    console.log("Trusted Signer:", trustedSigner);

    // 4. Set up example configuration if not already set
    if (platformTreasury === ethers.constants.AddressZero) {
      console.log("⚠️  Setting platform treasury to deployer address...");
      await chargeProcessor.setPlatformTreasury(deployer.address);
      console.log("✅ Platform treasury set to:", deployer.address);
    }

    if (platformFee.toString() === "0") {
      console.log("⚠️  Setting platform fee to 1%...");
      await chargeProcessor.setPlatformFee(100);
      console.log("✅ Platform fee set to 100 bps (1%)");
    }

    if (trustedSigner === ethers.constants.AddressZero) {
      console.log("⚠️  Setting trusted signer to deployer address...");
      await chargeProcessor.setTrustedSigner(deployer.address);
      console.log("✅ Trusted signer set to:", deployer.address);
    }

    // 5. Create example plan if none exist
    console.log("\n📋 Checking for existing plans...");
    const nextPlanId = await planRegistry.nextPlanId();
    
    if (nextPlanId.toString() === "1") {
      console.log("⚠️  No plans found. Creating example plan...");
      
      // Deploy a test token for the example plan
      const TestToken = await ethers.getContractFactory("TestToken");
      const testToken = await TestToken.deploy(
        "Example Token",
        "EXT",
        ethers.utils.parseEther("1000000")
      );
      await testToken.deployed();
      console.log("✅ Test token deployed at:", testToken.address);

      // Create example plan
      const tx = await planRegistry.createPlan(
        "Example Monthly Plan",
        1999, // $19.99 in cents
        "USD",
        30 * 24 * 3600, // 30 days
        [testToken.address]
      );
      await tx.wait();
      console.log("✅ Example plan created with ID: 1");

      // Set manual price for the test token
      await chargeProcessor.setManualPrice(testToken.address, ethers.utils.parseUnits("1", 18));
      console.log("✅ Manual price set for test token: $1");
    } else {
      console.log("✅ Plans already exist. Found", nextPlanId.toString(), "plans");
    }

    // 6. Display final configuration
    console.log("\n📊 Final Configuration:");
    console.log("======================");
    console.log("PlanRegistry:", deployment.contracts.planRegistry);
    console.log("SubscriptionRegistry:", deployment.contracts.subscriptionRegistry);
    console.log("ChargeProcessor:", deployment.contracts.chargeProcessor);
    console.log("Platform Treasury:", await chargeProcessor.platformTreasury());
    console.log("Platform Fee:", (await chargeProcessor.platformFeeBps()).toString(), "bps");
    console.log("Trusted Signer:", await chargeProcessor.trustedSigner());
    console.log("Total Plans:", (await planRegistry.nextPlanId()).toString());

    console.log("\n🎉 Initialization completed successfully!");

  } catch (error) {
    console.error("\n❌ Initialization failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
