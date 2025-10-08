// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import "./SubscriptionRegistry.sol";
import "./PlanRegistry.sol";

/**
 * @title ChargeProcessor
 * @author [Your Name/Team]
 * @notice Handles subscription-based charges, refunds, and merchant spend limits.
 *         Supports both direct charges and signed quotes (for discounts).
 * @dev Uses ReentrancyGuard, Pausable, and Ownable from OpenZeppelin.
 *      Token prices are fetched via Chainlink or manual overrides.
 */
contract ChargeProcessor is Pausable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Registry of active subscriptions
    SubscriptionRegistry public subscriptionRegistry;
    /// @notice Registry of billing plans
    PlanRegistry public planRegistry;

    /// @notice Maximum spend allowed per merchant (per 30-day period)
    mapping(address => uint256) public spendCap;
    /// @notice Amount spent by merchant in the current period
    mapping(address => uint256) public spentThisPeriod;
    /// @notice Timestamp of the last period reset for a merchant
    mapping(address => uint256) public lastReset;

    /// @notice Trusted signer for validating discounted charge quotes
    address public trustedSigner;

    /// @notice Tracks used invoice IDs to prevent replay attacks
    mapping(uint256 => bool) public usedInvoiceIds;

    /// @notice Chainlink price feeds for tokens (address → AggregatorV3Interface)
    mapping(address => AggregatorV3Interface) public priceFeeds;
    /// @notice Manually set token prices (address → price in 18 decimals)
    mapping(address => uint256) public manualPrices;

    // Platform fee (in bps, e.g. 100 = 1%)
    uint256 public platformFeeBps;
    address public platformTreasury;

    // --- Events ---
    /// @notice Emitted when a charge is attempted
    /// @param subscriptionId ID of the subscription being charged
    /// @param subscriber Address of the subscriber
    /// @param merchant Address of the merchant
    /// @param amount Charge amount in token units
    /// @param token Address of the token used
    event ChargeAttempted(
        uint256 subscriptionId,
        address subscriber,
        address merchant,
        uint256 amount,
        address token
    );

    /// @notice Emitted when a charge succeeds
    /// @param subscriptionId ID of the subscription
    /// @param subscriber Address of the subscriber
    /// @param merchant Address of the merchant
    /// @param amount Amount charged
    /// @param token Token address

    event ChargeSucceeded(
        uint256 subscriptionId,
        address subscriber,
        address merchant,
        uint256 amount,
        address token,
        uint256 platformFee
    );

    /// @notice Emitted when a charge fails
    /// @param subscriptionId ID of the subscription
    /// @param subscriber Address of the subscriber
    /// @param merchant Address of the merchant
    /// @param amount Attempted charge amount
    /// @param token Token address
    /// @param reason Failure reason
    event ChargeFailed(
        uint256 subscriptionId,
        address subscriber,
        address merchant,
        uint256 amount,
        address token,
        string reason
    );

    /// @notice Emitted when a refund is issued
    /// @param subscriptionId ID of the subscription
    /// @param subscriber Address of the subscriber
    /// @param merchant Address of the merchant
    /// @param amount Refund amount
    /// @param token Token address
    event RefundIssued(
        uint256 subscriptionId,
        address subscriber,
        address merchant,
        uint256 amount,
        address token
    );

    // --- Constructor ---
    /// @notice Initializes the contract with subscription and plan registries
    /// @param _subscriptionRegistry Address of the SubscriptionRegistry
    /// @param _planRegistry Address of the PlanRegistry
    constructor(
        address _subscriptionRegistry,
        address _planRegistry
    ) Ownable(msg.sender) {
        subscriptionRegistry = SubscriptionRegistry(_subscriptionRegistry);
        planRegistry = PlanRegistry(_planRegistry);
    }

    // --- Admin Functions ---
    /// @notice Sets the trusted signer for validating discounted quotes
    /// @dev Only callable by the owner
    /// @param signer Address of the trusted signer
    function setTrustedSigner(address signer) external onlyOwner {
        trustedSigner = signer;
    }

    /// @notice Sets the Chainlink price feed for a token
    /// @dev Reverts if the feed address is invalid
    /// @param token Token address
    /// @param feed Chainlink AggregatorV3Interface address
    function setPriceFeed(address token, address feed) external onlyOwner {
        priceFeeds[token] = AggregatorV3Interface(feed);
    }

    /// @notice Manually sets the price for a token (in 18 decimals)
    /// @dev Used as a fallback if no Chainlink feed is available
    /// @param token Token address
    /// @param price Price in USD (scaled to 18 decimals)
    function setManualPrice(address token, uint256 price) external onlyOwner {
        manualPrices[token] = price;
    }

    function setPlatformFee(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Fee too high"); // e.g., cap at 10%
        platformFeeBps = bps;
    }

    function setPlatformTreasury(address treasury) external onlyOwner {
        require(treasury != address(0), "Invalid treasury");
        platformTreasury = treasury;
    }

    function _distributePayment(
        address token,
        address subscriber,
        address merchant,
        uint256 expectedAmount
    ) internal {
        // 1. Track balance before
        uint256 beforeBal = IERC20(token).balanceOf(address(this));

        // 2. Pull funds into this contract
        IERC20(token).safeTransferFrom(
            subscriber,
            address(this),
            expectedAmount
        );

        // 3. Track balance after
        uint256 afterBal = IERC20(token).balanceOf(address(this));
        uint256 actualReceived = afterBal - beforeBal;

        // 4. Compute fee and merchant payout based on actual received
        uint256 fee = (actualReceived * platformFeeBps) / 10_000;
        uint256 merchantAmount = actualReceived - fee;

        // 5. Pay treasury and merchant
        if (fee > 0) {
            IERC20(token).safeTransfer(platformTreasury, fee);
        }
        IERC20(token).safeTransfer(merchant, merchantAmount);
    }

    // --- Core Charge Functions ---
    /// @notice Processes a standard charge for a subscription
    /// @dev Reverts if:
    ///      - Subscription is not active
    ///      - Billing is too early
    ///      - Plan is inactive
    ///      - Token transfer fails
    /// @param subscriptionId ID of the subscription to charge
    function processCharge(
        uint256 subscriptionId
    ) external whenNotPaused nonReentrant {
        SubscriptionRegistry.Subscription memory sub = subscriptionRegistry
            .getSubscription(subscriptionId);
        require(
            sub.status == SubscriptionRegistry.Status.Active,
            "Subscription not active"
        );
        require(block.timestamp >= sub.nextBilling, "Too early to bill");

        PlanRegistry.Plan memory plan = planRegistry.getPlan(sub.planId);
        require(plan.active, "Plan inactive");

        uint256 amount = _getTokenAmount(sub.payerToken, plan.priceInCents);

        emit ChargeAttempted(
            subscriptionId,
            sub.subscriber,
            plan.merchant,
            amount,
            sub.payerToken
        );

        // Distribute funds (platform fee + merchant payout)
        _distributePayment(
            sub.payerToken,
            sub.subscriber,
            plan.merchant,
            amount
        );

        // Update merchant spend cap
        _applySpendCap(plan.merchant, amount);

        // Update subscription registry
        uint256 nextBilling = block.timestamp + plan.billingIntervalSeconds;
        subscriptionRegistry.recordSuccessfulCharge(
            subscriptionId,
            nextBilling,
            0,
            sub.subscriber,
            sub.payerToken,
            amount
        );

        emit ChargeSucceeded(
            subscriptionId,
            sub.subscriber,
            plan.merchant,
            amount,
            sub.payerToken,
            (amount * platformFeeBps) / 10_000
        );
    }

    /// @notice Processes a charge with a signed quote (for discounts)
    /// @dev Reverts if:
    ///      - Invoice ID was already used
    ///      - Quote is expired
    ///      - Signer is not trusted
    ///      - Signature is invalid
    ///      - Subscription/plan validation fails
    /// @param subscriptionId ID of the subscription
    /// @param tokenAmount Amount to charge (in token units)
    /// @param expiry Quote expiration timestamp
    /// @param invoiceId Unique invoice ID to prevent replays
    /// @param signature ECDSA signature from the trusted signer
    function processChargeWithQuote(
        uint256 subscriptionId,
        uint256 tokenAmount,
        uint256 expiry,
        uint256 invoiceId,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        require(!usedInvoiceIds[invoiceId], "Invoice already used");
        usedInvoiceIds[invoiceId] = true;
        require(block.timestamp <= expiry, "Quote expired");
        require(trustedSigner != address(0), "Signer not set");
        require(tokenAmount > 0, "Invalid amount");

        SubscriptionRegistry.Subscription memory sub = _validateSubscription(
            subscriptionId
        );

        // Include domain-bound data in the signed payload: contract address and chain id
        // and the subscriber/payer token to prevent cross-contract/cross-chain replay.
        _verifySignature(
            subscriptionId,
            sub.subscriber,
            sub.payerToken,
            tokenAmount,
            expiry,
            invoiceId,
            signature
        );
        PlanRegistry.Plan memory plan = _validatePlan(sub.planId);

        // Ensure subscription's token is allowed by the plan
        require(_isTokenAllowed(plan, sub.payerToken), "Token not allowed");

        emit ChargeAttempted(
            subscriptionId,
            sub.subscriber,
            plan.merchant,
            tokenAmount,
            sub.payerToken
        );

        // Distribute funds (platform fee + merchant payout)
        _distributePayment(
            sub.payerToken,
            sub.subscriber,
            plan.merchant,
            tokenAmount
        );

        // Update merchant spend cap
        _applySpendCap(plan.merchant, tokenAmount);

        // Update subscription registry
        uint256 nextBilling = block.timestamp + plan.billingIntervalSeconds;
        subscriptionRegistry.recordSuccessfulCharge(
            subscriptionId,
            nextBilling,
            invoiceId,
            sub.subscriber,
            sub.payerToken,
            tokenAmount
        );

        emit ChargeSucceeded(
            subscriptionId,
            sub.subscriber,
            plan.merchant,
            tokenAmount,
            sub.payerToken,
            (tokenAmount * platformFeeBps) / 10_000
        );
    }

    // --- Internal Helper Functions ---
    /// @notice Verifies the ECDSA signature for a domain-bound quote
    /// @dev Reverts if the signature is invalid or not from the trusted signer
    ///      The signed payload includes the contract address and chain id to prevent
    ///      replay on other contracts or chains, and includes subscriber & payerToken
    ///      so signatures cannot be reused across subscribers or tokens.
    /// @param subscriptionId Subscription ID
    /// @param subscriber Subscriber address (must match subscription)
    /// @param payerToken Token address the subscriber will pay with
    /// @param tokenAmount Charged amount (in token units)
    /// @param expiry Quote expiration timestamp
    /// @param invoiceId Unique invoice ID
    /// @param signature ECDSA signature to verify
function _verifySignature(
        uint256 subscriptionId,
        address subscriber,
        address payerToken,
        uint256 tokenAmount,
        uint256 expiry,
        uint256 invoiceId,
        bytes calldata signature
) internal view {
    // Domain-bound payload to prevent cross-contract/cross-chain replay:
    // encode: contract address, chain id, subscriptionId, subscriber, payerToken, tokenAmount, expiry, invoiceId
    bytes32 raw = keccak256(
        abi.encode(
            address(this),
            block.chainid,
            subscriptionId,
            subscriber,
            payerToken,
            tokenAmount,
            expiry,
            invoiceId
        )
    );
    bytes32 messageHash = raw.toEthSignedMessageHash();
    address signer = ECDSA.recover(messageHash, signature);
    require(signer == trustedSigner, "Invalid signature");
}

    /// @notice Converts a USD price (in cents) to token units using Chainlink or manual prices
    /// @dev Reverts if:
    ///      - No price feed or manual price is available
    ///      - Chainlink feed returns stale/invalid data
    /// @param token Token address
    /// @param priceInCents Price in USD cents (e.g., 1000 = $10.00)
    /// @return Amount in token units (scaled to token decimals)
    function _getTokenAmount(
        address token,
        uint256 priceInCents
    ) internal view returns (uint256) {
        AggregatorV3Interface feed = priceFeeds[token];
        uint256 usdAmount = priceInCents * 1e16;

        uint256 tokenPrice;
        if (address(feed) != address(0)) {
            (, int256 price, , uint256 updatedAt, ) = feed.latestRoundData();
            require(price > 0, "invalid price");
            require(block.timestamp - updatedAt < 1 hours, "stale price");
            tokenPrice = uint256(price);
            uint8 feedDecimals = feed.decimals();
            uint8 tokenDecimals = IERC20Metadata(token).decimals();

            return
                (usdAmount * (10 ** tokenDecimals)) /
                (tokenPrice * (10 ** (18 - feedDecimals)));
        } else {
            require(manualPrices[token] > 0, "no price available");
            tokenPrice = manualPrices[token]; // Assume already scaled to 18 decimals
            uint8 tokenDecimals = IERC20Metadata(token).decimals();

            return (usdAmount * (10 ** tokenDecimals)) / tokenPrice;
        }
    }

    /// @notice Validates a subscription and returns its data
    /// @dev Reverts if the subscription is not active
    /// @param subscriptionId Subscription ID
    /// @return sub Subscription data
    function _validateSubscription(
        uint256 subscriptionId
    ) internal view returns (SubscriptionRegistry.Subscription memory) {
        SubscriptionRegistry.Subscription memory sub = subscriptionRegistry
            .getSubscription(subscriptionId);
        require(
            sub.status == SubscriptionRegistry.Status.Active,
            "Subscription not active"
        );
        return sub;
    }

    /// @notice Validates a plan and returns its data
    /// @dev Reverts if the plan is inactive
    /// @param planId Plan ID
    /// @return plan Plan data
    function _validatePlan(
        uint256 planId
    ) internal view returns (PlanRegistry.Plan memory) {
        PlanRegistry.Plan memory plan = planRegistry.getPlan(planId);
        require(plan.active, "Plan inactive");
        return plan;
    }

    /// @notice Checks if a token is allowed for a plan
    /// @param plan Plan data
    /// @param token Token address
    /// @return bool True if the token is allowed
    function _isTokenAllowed(
        PlanRegistry.Plan memory plan,
        address token
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < plan.allowedTokens.length; i++) {
            if (plan.allowedTokens[i] == token) return true;
        }
        return false;
    }

    /// @notice External wrapper for safe token transfers (allows try/catch)
    /// @dev Reverts if called externally (only callable by this contract)
    /// @param token Token address
    /// @param from Sender address
    /// @param to Recipient address
    /// @param amount Amount to transfer
    function _safeTransfer(
        address token,
        address from,
        address to,
        uint256 amount
    ) external {
        require(msg.sender == address(this), "only callable internally");
        IERC20(token).safeTransferFrom(from, to, amount);
    }

    // --- Merchant Spend Cap Logic ---
    /// @notice Sets the spend cap for a merchant (per 30-day period)
    /// @dev Only callable by the owner
    /// @param merchant Merchant address
    /// @param cap Maximum spend allowed (in token units)
    function setSpendCap(address merchant, uint256 cap) external onlyOwner {
        spendCap[merchant] = cap;
    }

    /// @notice Updates the spent amount for a merchant and enforces the cap
    /// @dev Resets the period if 30 days have passed
    /// @param merchant Merchant address
    /// @param amount Amount to add to the spent total
    function _applySpendCap(address merchant, uint256 amount) internal {
        uint256 period = 30 days;
        if (block.timestamp > lastReset[merchant] + period) {
            spentThisPeriod[merchant] = 0;
            lastReset[merchant] = block.timestamp;
        }
        // If cap is zero, treat as unlimited (do not enforce)
        if (spendCap[merchant] == 0) {
            // Still track spend for observability, but don't enforce
            spentThisPeriod[merchant] += amount;
            return;
        }
        spentThisPeriod[merchant] += amount;
        require(spentThisPeriod[merchant] <= spendCap[merchant], "merchant cap exceeded");
    }

    // --- Refund Logic ---
    /// @notice Issues a refund to a subscriber
    /// @dev Reverts if:
    ///      - Caller is not the merchant
    ///      - Token transfer fails
    /// @param subscriptionId Subscription ID
    /// @param subscriber Subscriber address
    /// @param amount Refund amount
    /// @param token Token address
    function issueRefund(
        uint256 subscriptionId,
        address subscriber,
        uint256 amount,
        address token
    ) external nonReentrant whenNotPaused {
        SubscriptionRegistry.Subscription memory sub = subscriptionRegistry
            .getSubscription(subscriptionId);
        PlanRegistry.Plan memory plan = planRegistry.getPlan(sub.planId);
        require(msg.sender == plan.merchant, "Only merchant can refund");

        IERC20(token).safeTransferFrom(msg.sender, subscriber, amount);

        emit RefundIssued(
            subscriptionId,
            subscriber,
            msg.sender,
            amount,
            token
        );
    }

    // --- Pause/Unpause ---
    /// @notice Pauses all contract operations (emergency stop)
    /// @dev Only callable by the owner
    function pauseAll() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses all contract operations
    /// @dev Only callable by the owner
    function unpauseAll() external onlyOwner {
        _unpause();
    }
}
