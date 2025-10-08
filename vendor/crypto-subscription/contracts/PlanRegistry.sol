// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PlanRegistry
 * @author YourName (or YourOrganization)
 * @notice A contract for merchants to create, update, and manage subscription plans.
 *         Merchants can define plans with pricing, billing intervals, and allowed payment tokens.
 *         Plans can be paused/unpaused by merchants or globally by the contract owner.
 * @dev - Uses OpenZeppelin's `Ownable` for access control and `Pausable` for emergency stops.
 *      - Tracks plans by `planId` (auto-incremented) and maps them to merchants for easy lookup.
 *      - Emits events for critical actions (plan creation, updates, pauses).
 *      - All price inputs are in **cents** (e.g., 1999 = $19.99) to avoid floating-point issues.
 *      - Uses `whenNotPaused` modifier to prevent actions during global pauses.
 */
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract PlanRegistry is Ownable, Pausable {
    struct Plan {
        address merchant;
        string name;
        uint256 priceInCents; // price in cents of fiat, e.g., 1999 = $19.99
        string currency; // "USD"
        uint32 billingIntervalSeconds; // e.g., 30 days = 30*86400
        address[] allowedTokens; // tokens customers may pay with
        bool active;
    }

    uint256 public nextPlanId = 1;
    mapping(uint256 => Plan) public plans;

    // NEW: Track plans by merchant
    mapping(address => uint256[]) private merchantPlans;

    /// @notice Emitted when a new plan is created.
    /// @param planId The ID of the newly created plan.
    /// @param merchant The address of the merchant who created the plan.
    event PlanCreated(uint256 indexed planId, address indexed merchant);

    /// @notice Emitted when a plan is updated.
    /// @param planId The ID of the updated plan.
    event PlanUpdated(uint256 indexed planId);

    /// @notice Emitted when a plan is paused by its merchant.
    /// @param planId The ID of the paused plan.
    event PlanPaused(uint256 indexed planId);

    /// @notice Emitted when a plan is unpaused by its merchant.
    /// @param planId The ID of the unpaused plan.
    event PlanUnpaused(uint256 indexed planId);

    /// @dev Modifier to restrict access to the merchant who owns the plan.
    /// @param planId The ID of the plan to check ownership for.
    modifier onlyMerchant(uint256 planId) {
        require(plans[planId].merchant == msg.sender, "Not plan merchant");
        _;
    }

    /// @notice Initializes the contract, setting the deployer as the owner.
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Creates a new subscription plan for the calling merchant.
     * @dev - Emits `PlanCreated` event on success.
     *      - Reverts if `priceInCents` is 0, `billingIntervalSeconds` < 1 day, or `allowedTokens` is empty.
     *      - Stores the plan ID in the merchant's plan list for easy lookup.
     * @param name Human-readable plan name (e.g., "Premium Monthly").
     * @param priceInCents Price in cents (e.g., 1999 for $19.99).
     * @param currency Currency code (e.g., "USD", "EUR").
     * @param billingIntervalSeconds How often to bill (e.g., `30 days`).
     * @param allowedTokens List of ERC20 tokens accepted for payments.
     * @return planId The auto-incremented ID of the new plan.
     */
    function createPlan(
        string calldata name,
        uint256 priceInCents,
        string calldata currency,
        uint32 billingIntervalSeconds,
        address[] calldata allowedTokens
    ) external whenNotPaused returns (uint256) {
        require(priceInCents > 0, "price must be > 0");
        require(billingIntervalSeconds >= 1 days, "billing interval too small");
        require(allowedTokens.length > 0, "need allowed tokens");

        uint256 planId = nextPlanId++;
        plans[planId] = Plan({
            merchant: msg.sender,
            name: name,
            priceInCents: priceInCents,
            currency: currency,
            billingIntervalSeconds: billingIntervalSeconds,
            allowedTokens: allowedTokens,
            active: true
        });

        merchantPlans[msg.sender].push(planId);

        emit PlanCreated(planId, msg.sender);
        return planId;
    }

    /**
     * @notice Updates an existing plan.
     * @dev - Only callable by the plan's merchant.
     *      - Emits `PlanUpdated` event on success.
     *      - Can modify all plan parameters except `merchant`.
     * @param planId The ID of the plan to update.
     * @param name New human-readable plan name.
     * @param priceInCents New price in cents.
     * @param billingIntervalSeconds New billing interval in seconds.
     * @param allowedTokens New list of accepted ERC20 tokens.
     * @param active New active status of the plan.
     */
    function updatePlan(
        uint256 planId,
        string calldata name,
        uint256 priceInCents,
        uint32 billingIntervalSeconds,
        address[] calldata allowedTokens,
        bool active
    ) external whenNotPaused onlyMerchant(planId) {
        Plan storage p = plans[planId];
        p.name = name;
        p.priceInCents = priceInCents;
        p.billingIntervalSeconds = billingIntervalSeconds;
        p.allowedTokens = allowedTokens;
        p.active = active;

        emit PlanUpdated(planId);
    }

    /**
     * @notice Retrieves a plan by its ID.
     * @param planId The ID of the plan to retrieve.
     * @return The Plan struct containing all plan details.
     */
    function getPlan(uint256 planId) external view returns (Plan memory) {
        return plans[planId];
    }

    /**
     * @notice Pauses a plan, preventing new subscriptions.
     * @dev - Only callable by the plan's merchant.
     *      - Emits `PlanPaused` event on success.
     *      - Sets the plan's `active` status to false.
     * @param planId The ID of the plan to pause.
     */
    function pausePlan(uint256 planId) external onlyMerchant(planId) {
        plans[planId].active = false;
        emit PlanPaused(planId);
    }

    /**
     * @notice Unpauses a plan, allowing new subscriptions.
     * @dev - Only callable by the plan's merchant.
     *      - Emits `PlanUnpaused` event on success.
     *      - Sets the plan's `active` status to true.
     * @param planId The ID of the plan to unpause.
     */
    function unpausePlan(uint256 planId) external onlyMerchant(planId) {
        plans[planId].active = true;
        emit PlanUnpaused(planId);
    }

    /**
     * @notice Retrieves the list of allowed payment tokens for a plan.
     * @param planId The ID of the plan to query.
     * @return An array of token addresses accepted for payments.
     */
    function getAllowedTokens(uint256 planId) external view returns (address[] memory) {
        return plans[planId].allowedTokens;
    }

    /**
     * @notice Retrieves the IDs of all plans created by a merchant.
     * @param merchant The address of the merchant to query.
     * @return An array of plan IDs created by the merchant.
     */
    function getMerchantPlans(address merchant) external view returns (uint256[] memory) {
        return merchantPlans[merchant];
    }

    /**
     * @notice Retrieves full details of all plans created by a merchant.
     * @dev - Returns an array of Plan structs.
     *      - Useful for frontends displaying all of a merchant's plans.
     * @param merchant The address of the merchant to query.
     * @return An array of Plan structs containing all plan details.
     */
    function getMerchantPlanDetails(address merchant) external view returns (Plan[] memory) {
        uint256[] storage ids = merchantPlans[merchant];
        Plan[] memory result = new Plan[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = plans[ids[i]];
        }

        return result;
    }

    /**
     * @notice Pauses all functionality of the contract.
     * @dev - Only callable by the contract owner.
     *      - Uses OpenZeppelin's `_pause()` to set the paused state.
     */
    function pauseAll() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses all functionality of the contract.
     * @dev - Only callable by the contract owner.
     *      - Uses OpenZeppelin's `_unpause()` to clear the paused state.
     */
    function unpauseAll() external onlyOwner {
        _unpause();
    }
}