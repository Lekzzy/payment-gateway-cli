import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("PlanRegistry", function () {
  let planRegistry: Contract;
  let owner: Signer;
  let merchant: Signer;
  let otherMerchant: Signer;
  let token: Contract;

  beforeEach(async () => {
    [owner, merchant, otherMerchant] = await ethers.getSigners();

    // Deploy TestToken
    const TestToken = await ethers.getContractFactory("TestToken");
    token = await TestToken.deploy("Test Token", "TST", ethers.utils.parseEther("1000000"));
    await token.deployed();

    // Deploy PlanRegistry
    const PlanRegistry = await ethers.getContractFactory("PlanRegistry");
    planRegistry = await PlanRegistry.deploy();
    await planRegistry.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await planRegistry.owner()).to.equal(await owner.getAddress());
    });

    it("Should initialize with nextPlanId = 1", async function () {
      expect(await planRegistry.nextPlanId()).to.equal(1);
    });
  });

  describe("Plan Creation", function () {
    it("Should create a plan successfully", async function () {
      const tx = await planRegistry.connect(merchant).createPlan(
        "Basic Plan",
        1000, // $10.00 in cents
        "USD",
        30 * 24 * 3600, // 30 days
        [token.address]
      );

      await expect(tx)
        .to.emit(planRegistry, "PlanCreated")
        .withArgs(1, await merchant.getAddress());

      const plan = await planRegistry.getPlan(1);
      expect(plan.merchant).to.equal(await merchant.getAddress());
      expect(plan.name).to.equal("Basic Plan");
      expect(plan.priceInCents).to.equal(1000);
      expect(plan.currency).to.equal("USD");
      expect(plan.billingIntervalSeconds).to.equal(30 * 24 * 3600);
      expect(plan.allowedTokens[0]).to.equal(token.address);
      expect(plan.active).to.be.true;
    });

    it("Should revert when price is 0", async function () {
      await expect(
        planRegistry.connect(merchant).createPlan(
          "Basic Plan",
          0,
          "USD",
          30 * 24 * 3600,
          [token.address]
        )
      ).to.be.revertedWith("price must be > 0");
    });

    it("Should revert when billing interval is too small", async function () {
      await expect(
        planRegistry.connect(merchant).createPlan(
          "Basic Plan",
          1000,
          "USD",
          12 * 3600, // 12 hours
          [token.address]
        )
      ).to.be.revertedWith("billing interval too small");
    });

    it("Should revert when no allowed tokens", async function () {
      await expect(
        planRegistry.connect(merchant).createPlan(
          "Basic Plan",
          1000,
          "USD",
          30 * 24 * 3600,
          []
        )
      ).to.be.revertedWith("need allowed tokens");
    });
  });

  describe("Plan Management", function () {
    beforeEach(async () => {
      await planRegistry.connect(merchant).createPlan(
        "Basic Plan",
        1000,
        "USD",
        30 * 24 * 3600,
        [token.address]
      );
    });

    it("Should update plan successfully", async function () {
      const tx = await planRegistry.connect(merchant).updatePlan(
        1,
        "Updated Plan",
        2000,
        60 * 24 * 3600,
        [token.address],
        true
      );

      await expect(tx).to.emit(planRegistry, "PlanUpdated").withArgs(1);

      const plan = await planRegistry.getPlan(1);
      expect(plan.name).to.equal("Updated Plan");
      expect(plan.priceInCents).to.equal(2000);
      expect(plan.billingIntervalSeconds).to.equal(60 * 24 * 3600);
    });

    it("Should revert when non-merchant tries to update", async function () {
      await expect(
        planRegistry.connect(otherMerchant).updatePlan(
          1,
          "Updated Plan",
          2000,
          60 * 24 * 3600,
          [token.address],
          true
        )
      ).to.be.revertedWith("Not plan merchant");
    });

    it("Should pause plan successfully", async function () {
      const tx = await planRegistry.connect(merchant).pausePlan(1);
      await expect(tx).to.emit(planRegistry, "PlanPaused").withArgs(1);

      const plan = await planRegistry.getPlan(1);
      expect(plan.active).to.be.false;
    });

    it("Should unpause plan successfully", async function () {
      await planRegistry.connect(merchant).pausePlan(1);
      
      const tx = await planRegistry.connect(merchant).unpausePlan(1);
      await expect(tx).to.emit(planRegistry, "PlanUnpaused").withArgs(1);

      const plan = await planRegistry.getPlan(1);
      expect(plan.active).to.be.true;
    });
  });

  describe("View Functions", function () {
    beforeEach(async () => {
      await planRegistry.connect(merchant).createPlan(
        "Plan 1",
        1000,
        "USD",
        30 * 24 * 3600,
        [token.address]
      );
      await planRegistry.connect(merchant).createPlan(
        "Plan 2",
        2000,
        "USD",
        60 * 24 * 3600,
        [token.address]
      );
    });

    it("Should return merchant plans", async function () {
      const merchantPlans = await planRegistry.getMerchantPlans(await merchant.getAddress());
      expect(merchantPlans.length).to.equal(2);
      expect(merchantPlans[0]).to.equal(1);
      expect(merchantPlans[1]).to.equal(2);
    });

    it("Should return merchant plan details", async function () {
      const planDetails = await planRegistry.getMerchantPlanDetails(await merchant.getAddress());
      expect(planDetails.length).to.equal(2);
      expect(planDetails[0].name).to.equal("Plan 1");
      expect(planDetails[1].name).to.equal("Plan 2");
    });

    it("Should return allowed tokens", async function () {
      const allowedTokens = await planRegistry.getAllowedTokens(1);
      expect(allowedTokens[0]).to.equal(token.address);
    });
  });

  describe("Pause/Unpause", function () {
    it("Should pause all functionality", async function () {
      await planRegistry.connect(owner).pauseAll();
      expect(await planRegistry.paused()).to.be.true;
    });

    it("Should unpause all functionality", async function () {
      await planRegistry.connect(owner).pauseAll();
      await planRegistry.connect(owner).unpauseAll();
      expect(await planRegistry.paused()).to.be.false;
    });

    it("Should revert when non-owner tries to pause", async function () {
      await expect(planRegistry.connect(merchant).pauseAll())
        .to.be.revertedWithCustomError(planRegistry, "OwnableUnauthorizedAccount")
        .withArgs(await merchant.getAddress());
    });
  });
});
