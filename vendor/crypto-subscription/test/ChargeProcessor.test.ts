import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("ChargeProcessor", function () {
  let planRegistry: Contract;
  let subscriptionRegistry: Contract;
  let chargeProcessor: Contract;
  let owner: Signer;
  let merchant: Signer;
  let subscriber: Signer;
  let trustedSigner: Signer;
  let token: Contract;

  beforeEach(async () => {
    [owner, merchant, subscriber, trustedSigner] = await ethers.getSigners();

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

    // Deploy ChargeProcessor
    const ChargeProcessor = await ethers.getContractFactory("ChargeProcessor");
    chargeProcessor = await ChargeProcessor.deploy(
      subscriptionRegistry.address,
      planRegistry.address
    );
    await chargeProcessor.deployed();

    // Set ChargeProcessor in SubscriptionRegistry
    await subscriptionRegistry.setChargeProcessor(chargeProcessor.address);

    // Create a plan
    await planRegistry.connect(merchant).createPlan(
      "Basic Plan",
      1000, // $10.00 in cents
      "USD",
      30 * 24 * 3600, // 30 days
      [token.address]
    );

    // Subscribe to plan
    await subscriptionRegistry.connect(subscriber).subscribe(1, token.address);

    // Mint tokens to subscriber and approve ChargeProcessor
    await token.mint(await subscriber.getAddress(), ethers.utils.parseEther("1000"));
    await token.connect(subscriber).approve(chargeProcessor.address, ethers.utils.parseEther("1000"));

    // Set trusted signer and platform configuration
    await chargeProcessor.setTrustedSigner(await trustedSigner.getAddress());
    await chargeProcessor.setPlatformTreasury(await owner.getAddress());
    await chargeProcessor.setPlatformFee(100); // 1%

    // Set manual price for token (1 token = $1)
    await chargeProcessor.setManualPrice(token.address, ethers.utils.parseUnits("1", 18));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await chargeProcessor.owner()).to.equal(await owner.getAddress());
    });

    it("Should set the right subscription registry", async function () {
      expect(await chargeProcessor.subscriptionRegistry()).to.equal(subscriptionRegistry.address);
    });

    it("Should set the right plan registry", async function () {
      expect(await chargeProcessor.planRegistry()).to.equal(planRegistry.address);
    });
  });

  describe("Configuration", function () {
    it("Should set trusted signer", async function () {
      const newSigner = ethers.Wallet.createRandom().address;
      await chargeProcessor.setTrustedSigner(newSigner);
      expect(await chargeProcessor.trustedSigner()).to.equal(newSigner);
    });

    it("Should set platform treasury", async function () {
      const newTreasury = ethers.Wallet.createRandom().address;
      await chargeProcessor.setPlatformTreasury(newTreasury);
      expect(await chargeProcessor.platformTreasury()).to.equal(newTreasury);
    });

    it("Should set platform fee", async function () {
      await chargeProcessor.setPlatformFee(200); // 2%
      expect(await chargeProcessor.platformFeeBps()).to.equal(200);
    });

    it("Should revert when fee is too high", async function () {
      await expect(chargeProcessor.setPlatformFee(1001)).to.be.revertedWith("Fee too high");
    });

    it("Should set manual price", async function () {
      const price = ethers.utils.parseUnits("2", 18); // $2
      await chargeProcessor.setManualPrice(token.address, price);
      expect(await chargeProcessor.manualPrices(token.address)).to.equal(price);
    });

    it("Should revert when non-owner tries to configure", async function () {
      await expect(
        chargeProcessor.connect(merchant).setTrustedSigner(ethers.Wallet.createRandom().address)
      )
        .to.be.revertedWithCustomError(chargeProcessor, "OwnableUnauthorizedAccount")
        .withArgs(await merchant.getAddress());
    });
  });

  describe("Process Charge", function () {
    it("Should process charge successfully", async function () {
      const subscriptionId = 1;
      const expectedAmount = ethers.utils.parseEther("10"); // $10 worth of tokens

      const tx = await chargeProcessor.processCharge(subscriptionId);

      await expect(tx)
        .to.emit(chargeProcessor, "ChargeAttempted")
        .withArgs(subscriptionId, await subscriber.getAddress(), await merchant.getAddress(), expectedAmount, token.address);

      await expect(tx)
        .to.emit(chargeProcessor, "ChargeSucceeded")
        .withArgs(subscriptionId, await subscriber.getAddress(), await merchant.getAddress(), expectedAmount, token.address, ethers.utils.parseEther("0.1"));

      // Check that subscription was updated
      const subscription = await subscriptionRegistry.getSubscription(subscriptionId);
      expect(subscription.nextBilling).to.be.greaterThan(Math.floor(Date.now() / 1000));
    });

    it("Should revert when subscription is not active", async function () {
      await subscriptionRegistry.connect(subscriber).cancel(1);
      await expect(chargeProcessor.processCharge(1)).to.be.revertedWith("Subscription not active");
    });

    it("Should revert when billing is too early", async function () {
      // This should work since we just created the subscription
      await chargeProcessor.processCharge(1);
      
      // Second charge should fail because billing is too early
      await expect(chargeProcessor.processCharge(1)).to.be.revertedWith("Too early to bill");
    });

    it("Should revert when plan is inactive", async function () {
      await planRegistry.connect(merchant).pausePlan(1);
      await expect(chargeProcessor.processCharge(1)).to.be.revertedWith("Plan inactive");
    });
  });

  describe("Process Charge With Quote", function () {
    it("Should process charge with quote successfully", async function () {
      const subscriptionId = 1;
      const tokenAmount = ethers.utils.parseEther("5");
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const invoiceId = 12345;

      // Create signature
      const abi = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "address", "address", "uint256", "uint256", "uint256"],
        [
          chargeProcessor.address,
          (await ethers.provider.getNetwork()).chainId,
          subscriptionId,
          await subscriber.getAddress(),
          token.address,
          tokenAmount,
          expiry,
          invoiceId,
        ]
      );
      const hash = ethers.utils.keccak256(abi);
      const signature = await trustedSigner.signMessage(ethers.utils.arrayify(hash));

      const tx = await chargeProcessor.processChargeWithQuote(
        subscriptionId,
        tokenAmount,
        expiry,
        invoiceId,
        signature
      );

      await expect(tx)
        .to.emit(chargeProcessor, "ChargeSucceeded")
        .withArgs(subscriptionId, await subscriber.getAddress(), await merchant.getAddress(), tokenAmount, token.address, ethers.utils.parseEther("0.05"));

      // Check that invoice ID was marked as used
      expect(await chargeProcessor.usedInvoiceIds(invoiceId)).to.be.true;
    });

    it("Should revert when invoice already used", async function () {
      const subscriptionId = 1;
      const tokenAmount = ethers.utils.parseEther("5");
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const invoiceId = 12346;

      // Create signature
      const abi = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "address", "address", "uint256", "uint256", "uint256"],
        [
          chargeProcessor.address,
          (await ethers.provider.getNetwork()).chainId,
          subscriptionId,
          await subscriber.getAddress(),
          token.address,
          tokenAmount,
          expiry,
          invoiceId,
        ]
      );
      const hash = ethers.utils.keccak256(abi);
      const signature = await trustedSigner.signMessage(ethers.utils.arrayify(hash));

      // First call should succeed
      await chargeProcessor.processChargeWithQuote(subscriptionId, tokenAmount, expiry, invoiceId, signature);

      // Second call should fail
      await expect(
        chargeProcessor.processChargeWithQuote(subscriptionId, tokenAmount, expiry, invoiceId, signature)
      ).to.be.revertedWith("Invoice already used");
    });

    it("Should revert when quote expired", async function () {
      const subscriptionId = 1;
      const tokenAmount = ethers.utils.parseEther("5");
      const expiry = Math.floor(Date.now() / 1000) - 10; // Already expired
      const invoiceId = 12347;

      const abi = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "address", "address", "uint256", "uint256", "uint256"],
        [
          chargeProcessor.address,
          (await ethers.provider.getNetwork()).chainId,
          subscriptionId,
          await subscriber.getAddress(),
          token.address,
          tokenAmount,
          expiry,
          invoiceId,
        ]
      );
      const hash = ethers.utils.keccak256(abi);
      const signature = await trustedSigner.signMessage(ethers.utils.arrayify(hash));

      await expect(
        chargeProcessor.processChargeWithQuote(subscriptionId, tokenAmount, expiry, invoiceId, signature)
      ).to.be.revertedWith("Quote expired");
    });

    it("Should revert with invalid signature", async function () {
      const subscriptionId = 1;
      const tokenAmount = ethers.utils.parseEther("5");
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const invoiceId = 12348;

      // Sign with wrong key
      const abi = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "address", "address", "uint256", "uint256", "uint256"],
        [
          chargeProcessor.address,
          (await ethers.provider.getNetwork()).chainId,
          subscriptionId,
          await subscriber.getAddress(),
          token.address,
          tokenAmount,
          expiry,
          invoiceId,
        ]
      );
      const hash = ethers.utils.keccak256(abi);
      const signature = await merchant.signMessage(ethers.utils.arrayify(hash)); // Wrong signer

      await expect(
        chargeProcessor.processChargeWithQuote(subscriptionId, tokenAmount, expiry, invoiceId, signature)
      ).to.be.revertedWith("Invalid signature");
    });
  });

  describe("Merchant Spend Cap", function () {
    it("Should set spend cap", async function () {
      const cap = ethers.utils.parseEther("1000");
      await chargeProcessor.setSpendCap(await merchant.getAddress(), cap);
      expect(await chargeProcessor.spendCap(await merchant.getAddress())).to.equal(cap);
    });

    it("Should enforce spend cap", async function () {
      const cap = ethers.utils.parseEther("10");
      await chargeProcessor.setSpendCap(await merchant.getAddress(), cap);

      // First charge should succeed
      await chargeProcessor.processCharge(1);

      // Second charge should fail due to cap. Use a quoted charge to bypass nextBilling timing
      const subscriptionId = 1;
      const tokenAmount = ethers.utils.parseEther("10");
      const expiry = Math.floor(Date.now() / 1000) + 3600;
      const invoiceId = 99999;

      const abi = ethers.utils.defaultAbiCoder.encode(
        [
          "address",
          "uint256",
          "uint256",
          "address",
          "address",
          "uint256",
          "uint256",
          "uint256",
        ],
        [
          chargeProcessor.address,
          (await ethers.provider.getNetwork()).chainId,
          subscriptionId,
          await subscriber.getAddress(),
          token.address,
          tokenAmount,
          expiry,
          invoiceId,
        ]
      );
      const hash = ethers.utils.keccak256(abi);
      const signature = await trustedSigner.signMessage(ethers.utils.arrayify(hash));

      await expect(
        chargeProcessor.processChargeWithQuote(
          subscriptionId,
          tokenAmount,
          expiry,
          invoiceId,
          signature
        )
      ).to.be.revertedWith("merchant cap exceeded");
    });

    it("Should reset spend cap after period", async function () {
      const cap = ethers.utils.parseEther("10");
      await chargeProcessor.setSpendCap(await merchant.getAddress(), cap);

      // First charge
      await chargeProcessor.processCharge(1);

      // Fast forward time by 31 days
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 3600]);
      await ethers.provider.send("evm_mine", []);

      // Second charge should succeed after period reset
      await chargeProcessor.processCharge(1);
    });
  });

  describe("Refunds", function () {
    it("Should issue refund successfully", async function () {
      const subscriptionId = 1;
      const refundAmount = ethers.utils.parseEther("5");

      // Merchant needs tokens to refund
      await token.mint(await merchant.getAddress(), refundAmount);
      await token.connect(merchant).approve(chargeProcessor.address, refundAmount);

      const tx = await chargeProcessor.connect(merchant).issueRefund(
        subscriptionId,
        await subscriber.getAddress(),
        refundAmount,
        token.address
      );

      await expect(tx)
        .to.emit(chargeProcessor, "RefundIssued")
        .withArgs(subscriptionId, await subscriber.getAddress(), await merchant.getAddress(), refundAmount, token.address);
    });

    it("Should revert when non-merchant tries to refund", async function () {
      await expect(
        chargeProcessor.connect(subscriber).issueRefund(1, await subscriber.getAddress(), ethers.utils.parseEther("5"), token.address)
      ).to.be.revertedWith("Only merchant can refund");
    });
  });

  describe("Pause/Unpause", function () {
    it("Should pause all functionality", async function () {
      await chargeProcessor.pauseAll();
      expect(await chargeProcessor.paused()).to.be.true;
    });

    it("Should unpause all functionality", async function () {
      await chargeProcessor.pauseAll();
      await chargeProcessor.unpauseAll();
      expect(await chargeProcessor.paused()).to.be.false;
    });

    it("Should revert when paused", async function () {
      await chargeProcessor.pauseAll();
      await expect(chargeProcessor.processCharge(1))
        .to.be.revertedWithCustomError(chargeProcessor, "EnforcedPause");
    });
  });
});
