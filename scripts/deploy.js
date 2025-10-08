// Deploys PlanRegistry, SubscriptionRegistry, ChargeProcessor in correct order
import { ethers } from "hardhat";

async function main() {
  // 1. Deploy PlanRegistry
  const PlanRegistry = await ethers.getContractFactory("PlanRegistry");
  const planRegistry = await PlanRegistry.deploy();
  await planRegistry.deployed();
  console.log("PlanRegistry deployed at:", planRegistry.address);

  // 2. Deploy SubscriptionRegistry (needs PlanRegistry address)
  const SubscriptionRegistry = await ethers.getContractFactory(
    "SubscriptionRegistry"
  );
  const subscriptionRegistry = await SubscriptionRegistry.deploy(
    planRegistry.address
  );
  await subscriptionRegistry.deployed();
  console.log(
    "SubscriptionRegistry deployed at:",
    subscriptionRegistry.address
  );

  // 3. Deploy ChargeProcessor (needs SubscriptionRegistry and PlanRegistry addresses)
  const ChargeProcessor = await ethers.getContractFactory("ChargeProcessor");
  const chargeProcessor = await ChargeProcessor.deploy(
    subscriptionRegistry.address,
    planRegistry.address
  );
  await chargeProcessor.deployed();
  console.log("ChargeProcessor deployed at:", chargeProcessor.address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
