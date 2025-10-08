import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("SubscriptionRegistry", function () {
  let planRegistry: Contract;
  let subscriptionRegistry: Contract;
  let chargeProcessor: Contract;
  let owner: Signer;
  let merchant: Signer;
  let subscriber: Signer;
  let token: Contract;

  beforeEach(async () => {
    [owner, merchant, subscriber] = await ethers.getSigners();

    // Deploy TestToken
    const TestToken = await ethers.getContractFactory("TestToken");
    token = await TestToken.deploy("Test Token", "TST", ethers.utils.parseEther("1000000"));
    await token.deployed();

    // Deploy PlanRegistry
    const PlanRegistry = await ethers.getContractFactory("PlanRegistry");
    planRegistry = await PlanRegistry.deploy();
    await planRegistry.deployed();

    // Deploy SubscriptionRegistry
    const SubscriptionRegistry = await ethers.getContractFactory("SubscriptionRegistry");
    subscriptionRegistry = await SubscriptionRegistry.deploy(planRegistry.address);
    await subscriptionRegistry.deployed();

    // Option A: Use an EOA (owner) as the authorized charge processor for tests
    // This avoids trying to use a Contract as a Signer when calling registry methods.
    await subscriptionRegistry.setChargeProcessor(await (owner as any).getAddress());

    // Create a plan
    await planRegistry.connect(merchant).createPlan(
      "Basic Plan",
      1000, // $10.00 in cents
      "USD",
      30 * 24 * 3600, // 30 days
      [token.address]
    );
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await subscriptionRegistry.owner()).to.equal(await owner.getAddress());
    });

    it("Should set the right plan registry", async function () {
      expect(await subscriptionRegistry.planRegistry()).to.equal(planRegistry.address);
    });

    it("Should initialize with nextSubscriptionId = 1", async function () {
      expect(await subscriptionRegistry.nextSubscriptionId()).to.equal(1);
    });
  });

  describe("Subscription Creation", function () {
    it("Should create subscription successfully", async function () {
      const tx = await subscriptionRegistry.connect(subscriber).subscribe(1, token.address);

      await expect(tx)
        .to.emit(subscriptionRegistry, "Subscribed")
        .withArgs(1, 1, await subscriber.getAddress(), token.address, 0);

      const subscription = await subscriptionRegistry.getSubscription(1);
      expect(subscription.id).to.equal(1);
      expect(subscription.planId).to.equal(1);
      expect(subscription.subscriber).to.equal(await subscriber.getAddress());
      expect(subscription.payerToken).to.equal(token.address);
      expect(subscription.status).to.equal(0); // Active
    });

    it("Should revert when plan doesn't exist", async function () {
      await expect(
        subscriptionRegistry.connect(subscriber).subscribe(999, token.address)
      ).to.be.reverted;
    });

    it("Should revert when plan is inactive", async function () {
      await planRegistry.connect(merchant).pausePlan(1);
      await expect(
        subscriptionRegistry.connect(subscriber).subscribe(1, token.address)
      ).to.be.reverted;
    });

    it("Should revert when token not allowed", async function () {
      const OtherToken = await ethers.getContractFactory("TestToken");
      const otherToken = await OtherToken.deploy("Other Token", "OTH", ethers.utils.parseEther("1000000"));
      await otherToken.deployed();

      await expect(
        subscriptionRegistry.connect(subscriber).subscribe(1, otherToken.address)
      ).to.be.reverted;
    });
  });

  describe("Subscription Management", function () {
    beforeEach(async () => {
      await subscriptionRegistry.connect(subscriber).subscribe(1, token.address);
    });

    it("Should cancel subscription successfully", async function () {
      const tx = await subscriptionRegistry.connect(subscriber).cancel(1);
      await expect(tx)
        .to.emit(subscriptionRegistry, "SubscriptionCanceled")
        .withArgs(1, await subscriber.getAddress());

      const subscription = await subscriptionRegistry.getSubscription(1);
      expect(subscription.status).to.equal(2); // Cancelled
    });

    it("Should pause subscription successfully", async function () {
      const tx = await subscriptionRegistry.connect(subscriber).pauseSubscription(1);
      await expect(tx)
        .to.emit(subscriptionRegistry, "SubscriptionPaused")
        .withArgs(1, await subscriber.getAddress());

      const subscription = await subscriptionRegistry.getSubscription(1);
      expect(subscription.status).to.equal(1); // Paused
    });

    it("Should resume subscription successfully", async function () {
      await subscriptionRegistry.connect(subscriber).pauseSubscription(1);
      
      const tx = await subscriptionRegistry.connect(subscriber).resumeSubscription(1);
      await expect(tx)
        .to.emit(subscriptionRegistry, "SubscriptionResumed")
        .withArgs(1, await subscriber.getAddress());

      const subscription = await subscriptionRegistry.getSubscription(1);
      expect(subscription.status).to.equal(0); // Active
    });

    it("Should revert when non-subscriber tries to cancel", async function () {
      await expect(
        subscriptionRegistry.connect(merchant).cancel(1)
      ).to.be.revertedWith("not subscriber or owner");
    });
  });

  describe("Charge Recording", function () {
    beforeEach(async () => {
      await subscriptionRegistry.connect(subscriber).subscribe(1, token.address);
    });

    it("Should record successful charge", async function () {
      const nextBilling = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
      const tx = await subscriptionRegistry.connect(owner).recordSuccessfulCharge(
        1,
        nextBilling,
        123,
        await subscriber.getAddress(),
        token.address,
        ethers.utils.parseEther("10")
      );

      await expect(tx)
        .to.emit(subscriptionRegistry, "ChargeRecorded")
        .withArgs(1, 123, await subscriber.getAddress(), token.address, ethers.utils.parseEther("10"), true);

      const subscription = await subscriptionRegistry.getSubscription(1);
      expect(subscription.nextBilling).to.equal(nextBilling);
    });

    it("Should record failed charge", async function () {
      const tx = await subscriptionRegistry.connect(owner).recordFailedCharge(
        1,
        123,
        await subscriber.getAddress(),
        token.address,
        ethers.utils.parseEther("10")
      );

      await expect(tx)
        .to.emit(subscriptionRegistry, "ChargeRecorded")
        .withArgs(1, 123, await subscriber.getAddress(), token.address, ethers.utils.parseEther("10"), false);
    });

    it("Should revert when non-charge-processor tries to record", async function () {
      await expect(
        subscriptionRegistry.connect(subscriber).recordSuccessfulCharge(
          1,
          Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          123,
          await subscriber.getAddress(),
          token.address,
          ethers.utils.parseEther("10")
        )
      ).to.be.revertedWith("only charge processor");
    });
  });

  describe("View Functions", function () {
    beforeEach(async () => {
      await subscriptionRegistry.connect(subscriber).subscribe(1, token.address);
    });

    it("Should return subscription details", async function () {
      const subscription = await subscriptionRegistry.getSubscription(1);
      expect(subscription.id).to.equal(1);
      expect(subscription.planId).to.equal(1);
      expect(subscription.subscriber).to.equal(await subscriber.getAddress());
    });

    it("Should return subscriptions for subscriber", async function () {
      const subscriptions = await subscriptionRegistry.getSubscriptionsForSubscriber(await subscriber.getAddress());
      expect(subscriptions.length).to.equal(1);
      expect(subscriptions[0]).to.equal(1);
    });

    it("Should return subscriptions for merchant", async function () {
      const subscriptions = await subscriptionRegistry.getSubscriptionsForMerchant(await merchant.getAddress());
      expect(subscriptions.length).to.equal(1);
      expect(subscriptions[0]).to.equal(1);
    });
  });

  describe("Admin Functions", function () {
    it("Should set charge processor", async function () {
      const newChargeProcessor = ethers.Wallet.createRandom().address;
      await subscriptionRegistry.setChargeProcessor(newChargeProcessor);
      expect(await subscriptionRegistry.chargeProcessor()).to.equal(newChargeProcessor);
    });

    it("Should set plan registry", async function () {
      const newPlanRegistry = ethers.Wallet.createRandom().address;
      await subscriptionRegistry.setPlanRegistry(newPlanRegistry);
      expect(await subscriptionRegistry.planRegistry()).to.equal(newPlanRegistry);
    });

    it("Should revert when non-owner tries to set charge processor", async function () {
      await expect(
        subscriptionRegistry.connect(merchant).setChargeProcessor(ethers.Wallet.createRandom().address)
      )
        .to.be.revertedWithCustomError(subscriptionRegistry, "OwnableUnauthorizedAccount")
        .withArgs(await merchant.getAddress());
    });
  });

  describe("Pause/Unpause", function () {
    it("Should pause all functionality", async function () {
      await subscriptionRegistry.connect(owner).pauseAll();
      expect(await subscriptionRegistry.paused()).to.be.true;
    });

    it("Should unpause all functionality", async function () {
      await subscriptionRegistry.connect(owner).pauseAll();
      await subscriptionRegistry.connect(owner).unpauseAll();
      expect(await subscriptionRegistry.paused()).to.be.false;
    });
  });
});
