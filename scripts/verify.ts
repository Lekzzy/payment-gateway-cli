import { ethers } from "hardhat";
import { run } from "hardhat";

interface ContractInfo {
  address: string;
  constructorArgs: any[];
}

async function main() {
  console.log("🔍 Starting contract verification...\n");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

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
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  console.log("📄 Using deployment file:", latestDeployment);
  console.log("Deployment timestamp:", deployment.timestamp);

  const contracts: Record<string, ContractInfo> = {
    PlanRegistry: {
      address: deployment.contracts.planRegistry,
      constructorArgs: []
    },
    SubscriptionRegistry: {
      address: deployment.contracts.subscriptionRegistry,
      constructorArgs: [deployment.contracts.planRegistry]
    },
    ChargeProcessor: {
      address: deployment.contracts.chargeProcessor,
      constructorArgs: [deployment.contracts.subscriptionRegistry, deployment.contracts.planRegistry]
    }
  };

  for (const [contractName, contractInfo] of Object.entries(contracts)) {
    console.log(`\n🔍 Verifying ${contractName}...`);
    console.log("Address:", contractInfo.address);
    console.log("Constructor args:", contractInfo.constructorArgs);

    try {
      await run("verify:verify", {
        address: contractInfo.address,
        constructorArguments: contractInfo.constructorArgs,
      });
      console.log(`✅ ${contractName} verified successfully`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`✅ ${contractName} already verified`);
      } else {
        console.log(`❌ ${contractName} verification failed:`, error.message);
      }
    }
  }

  console.log("\n🎉 Verification process completed!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
