// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PlanRegistry.sol";


/// @title SubscriptionRegistry
/// @notice Manages subscriptions tied to plans in PlanRegistry. Supports pausing, cancellation, and billing cycles.
/// @dev Lightweight on-chain storage with off-chain metadata. Uses OpenZeppelin's Pausable, Ownable, and ReentrancyGuard.
contract SubscriptionRegistry is Pausable, Ownable, ReentrancyGuard {
    /// @notice Subscription status enum
    enum Status {
        Active,
        Paused,
        Cancelled,
        Expired
    }

    /// @notice Subscription data structure
    struct Subscription {
        uint256 id; /// @notice Unique subscription ID
        uint256 planId; /// @notice ID of the associated plan in PlanRegistry
        address subscriber; /// @notice Wallet address of the subscriber
        address payerToken; /// @notice ERC20 token used for payments
        Status status; /// @notice Current subscription status
        uint256 nextBilling; /// @notice Timestamp (seconds) for next billing cycle
        uint256 createdAt; /// @notice Timestamp when subscription was created
    }

    // --- State Variables ---
    uint256 public nextSubscriptionId = 1; /// @notice Auto-incrementing subscription ID counter

    mapping(uint256 => Subscription) public subscriptions; /// @notice Subscription storage by ID

    mapping(address => uint256[]) public subscriptionsBySubscriber; /// @notice Index of subscriptions by subscriber
    mapping(address => uint256[]) public subscriptionsByMerchant; /// @notice Index of subscriptions by merchant

    PlanRegistry public planRegistry; /// @notice Reference to PlanRegistry contract
    address public chargeProcessor; /// @notice Authorized ChargeProcessor contract/address

    // --- Events ---
    /// @notice Emitted when a new subscription is created
    event Subscribed(
        uint256 indexed subscriptionId,
        uint256 indexed planId,
        address indexed subscriber,
        address payerToken,
        uint256 nextBilling
    );

    /// @notice Emitted when a subscription is cancelled
    event SubscriptionCanceled(
        uint256 indexed subscriptionId,
        address indexed subscriber
    );

    /// @notice Emitted when a subscription is paused
    event SubscriptionPaused(
        uint256 indexed subscriptionId,
        address indexed subscriber
    );

    /// @notice Emitted when a paused subscription is resumed
    event SubscriptionResumed(
        uint256 indexed subscriptionId,
        address indexed subscriber
    );

    /// @notice Emitted when a subscription's billing cycle is updated
    event BillingBumped(uint256 indexed subscriptionId, uint256 nextBilling);

    /// @notice Emitted when a charge is recorded (success or failure)
    event ChargeRecorded(
        uint256 indexed subscriptionId,
        uint256 indexed chargeId,
        address indexed payer,
        address token,
        uint256 tokenAmount,
        bool success
    );

    // --- Modifiers ---
    /// @dev Restricts access to the subscriber or contract owner
    modifier onlySubscriberOrOwner(uint256 subscriptionId) {
        require(
            msg.sender == subscriptions[subscriptionId].subscriber ||
                msg.sender == owner(),
            "not subscriber or owner"
        );
        _;
    }

    /// @dev Restricts access to the configured ChargeProcessor
    modifier onlyChargeProcessor() {
        require(msg.sender == chargeProcessor, "only charge processor");
        _;
    }

    // --- Constructor ---
    /// @param planRegistryAddress Address of the PlanRegistry contract
    constructor(address planRegistryAddress) Ownable(msg.sender) {
        require(planRegistryAddress != address(0), "invalid plan registry");
        planRegistry = PlanRegistry(planRegistryAddress);
    }

    // --- Core Functions ---
    /// @notice Subscribes the caller to a plan
    /// @dev Validates plan existence, active status, and token allowance.
    /// @param planId ID of the plan to subscribe to
    /// @param payerToken ERC20 token address for payments
    /// @return subscriptionId The newly created subscription ID
    function subscribe(
        uint256 planId,
        address payerToken
    ) external whenNotPaused nonReentrant returns (uint256) {
        // fetch plan and validate
        PlanRegistry.Plan memory plan = planRegistry.getPlan(planId);

        require(plan.merchant != address(0), "plan not found");
        require(plan.active, "plan inactive");
        require(_isTokenAllowed(plan, payerToken), "token not allowed");

        uint256 subId = nextSubscriptionId++;
        uint256 nextBilling = 0; // tests expect 0 at creation; billing is bumped after first successful charge

        subscriptions[subId] = Subscription({
            id: subId,
            planId: planId,
            subscriber: msg.sender,
            payerToken: payerToken,
            status: Status.Active,
            nextBilling: nextBilling,
            createdAt: block.timestamp
        });

        // index by subscriber
        subscriptionsBySubscriber[msg.sender].push(subId);

        // index by merchant
        subscriptionsByMerchant[plan.merchant].push(subId);

        emit Subscribed(subId, planId, msg.sender, payerToken, nextBilling);
        return subId;
    }

    /// @notice Cancels an active or paused subscription
    /// @dev Only callable by the subscriber or contract owner.
    /// @param subscriptionId ID of the subscription to cancel
    function cancel(
        uint256 subscriptionId
    )
        external
        whenNotPaused
        nonReentrant
        onlySubscriberOrOwner(subscriptionId)
    {
        Subscription storage s = subscriptions[subscriptionId];
        require(s.status == Status.Active || s.status == Status.Paused, "not cancellable");
        s.status = Status.Cancelled;
        emit SubscriptionCanceled(subscriptionId, s.subscriber);
    }

    /// @notice Pauses an active subscription
    /// @param subscriptionId ID of the subscription to pause
    function pauseSubscription(
        uint256 subscriptionId
    )
        external
        whenNotPaused
        nonReentrant
        onlySubscriberOrOwner(subscriptionId)
    {
        Subscription storage s = subscriptions[subscriptionId];
        require(s.status == Status.Active, "not active");
        s.status = Status.Paused;
        emit SubscriptionPaused(subscriptionId, s.subscriber);
    }

    /// @notice Resumes a paused subscription
    /// @param subscriptionId ID of the subscription to resume
    function resumeSubscription(
        uint256 subscriptionId
    )
        external
        whenNotPaused
        nonReentrant
        onlySubscriberOrOwner(subscriptionId)
    {
        Subscription storage s = subscriptions[subscriptionId];
        require(s.status == Status.Paused, "not paused");
        s.status = Status.Active;
        emit SubscriptionResumed(subscriptionId, s.subscriber);
    }

    /// @notice Records a successful charge and updates the next billing timestamp
    /// @dev Only callable by the ChargeProcessor.
    /// @param subscriptionId ID of the subscription charged
    /// @param newNextBilling New timestamp for the next billing cycle
    /// @param chargeId Optional charge ID (if tracked by ChargeProcessor)
    /// @param payer Address that paid
    /// @param token Token used for payment
    /// @param tokenAmount Amount paid (in token base units)
    function recordSuccessfulCharge(
        uint256 subscriptionId,
        uint256 newNextBilling,
        uint256 chargeId,
        address payer,
        address token,
        uint256 tokenAmount
    ) external whenNotPaused onlyChargeProcessor nonReentrant {
        Subscription storage s = subscriptions[subscriptionId];
        require(s.subscriber != address(0), "sub not found");
        require(s.status == Status.Active, "sub not active");

        // update billing timestamp
        s.nextBilling = newNextBilling;

        emit ChargeRecorded(subscriptionId, chargeId, payer, token, tokenAmount, true);
        emit BillingBumped(subscriptionId, newNextBilling);
    }

    /// @notice Records a failed charge attempt
    /// @dev Only callable by the ChargeProcessor. Retry logic is handled off-chain.
    /// @param subscriptionId ID of the subscription
    /// @param chargeId Charge ID (if tracked)
    /// @param payer Address that attempted payment
    /// @param token Token used
    /// @param tokenAmount Amount attempted
    function recordFailedCharge(
        uint256 subscriptionId,
        uint256 chargeId,
        address payer,
        address token,
        uint256 tokenAmount
    ) external whenNotPaused onlyChargeProcessor nonReentrant {
        Subscription storage s = subscriptions[subscriptionId];
        require(s.subscriber != address(0), "sub not found");

        emit ChargeRecorded(subscriptionId, chargeId, payer, token, tokenAmount, false);
    }

    // --- View Functions ---
    /// @notice Returns subscription details by ID
    /// @param subscriptionId ID of the subscription
    /// @return Subscription struct
    function getSubscription(
        uint256 subscriptionId
    ) external view returns (Subscription memory) {
        return subscriptions[subscriptionId];
    }

    /// @notice Returns all subscription IDs for a subscriber
    /// @param subscriber Address of the subscriber
    /// @return Array of subscription IDs
    function getSubscriptionsForSubscriber(
        address subscriber
    ) external view returns (uint256[] memory) {
        return subscriptionsBySubscriber[subscriber];
    }

    /// @notice Returns all subscription IDs for a merchant
    /// @param merchant Address of the merchant
    /// @return Array of subscription IDs
    function getSubscriptionsForMerchant(
        address merchant
    ) external view returns (uint256[] memory) {
        return subscriptionsByMerchant[merchant];
    }

    // --- Admin Functions ---
    /// @notice Sets the ChargeProcessor address
    /// @param _chargeProcessor Address of the ChargeProcessor
    function setChargeProcessor(address _chargeProcessor) external onlyOwner {
        chargeProcessor = _chargeProcessor;
    }

    /// @notice Updates the PlanRegistry address
    /// @param _planRegistry Address of the PlanRegistry contract
    function setPlanRegistry(address _planRegistry) external onlyOwner {
        require(_planRegistry != address(0), "zero addr");
        planRegistry = PlanRegistry(_planRegistry);
    }

    /// @notice Pauses all contract operations (emergency stop)
    function pauseAll() external onlyOwner {
        _pause();
    }

    /// @notice Resumes contract operations after pause
    function unpauseAll() external onlyOwner {
        _unpause();
    }

    // --- Internal Helpers ---
    /// @dev Checks if a token is allowed for a plan
    /// @param plan Plan struct from PlanRegistry
    /// @param token Token address to validate
    /// @return bool True if token is allowed
    function _isTokenAllowed(
        PlanRegistry.Plan memory plan,
        address token
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < plan.allowedTokens.length; i++) {
            if (plan.allowedTokens[i] == token) return true;
        }
        return false;
    }
}
