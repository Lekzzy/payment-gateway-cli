# Crypto Subscription System

A comprehensive subscription-based payment system for crypto tokens, built on Polygon. This system enables merchants to create subscription plans and process recurring payments using various ERC20 tokens.

## 🚀 Features

- **Plan Management**: Merchants can create, update, and manage subscription plans
- **Subscription Lifecycle**: Complete subscription management with pause/resume/cancel functionality
- **Flexible Payments**: Support for multiple ERC20 tokens with Chainlink price feeds
- **Signed Quotes**: Support for discounted payments with cryptographic signatures
- **Merchant Caps**: Configurable spending limits per merchant
- **Platform Fees**: Built-in fee collection and distribution system
- **Security**: Comprehensive access controls and reentrancy protection

## 📋 Architecture

The system consists of three core smart contracts:

### 1. PlanRegistry
- Merchants create and manage subscription plans
- Defines pricing, billing intervals, and allowed payment tokens
- Supports plan pausing/unpausing

### 2. SubscriptionRegistry
- Manages subscriber subscriptions to plans
- Tracks subscription status and billing cycles
- Records successful and failed charge attempts

### 3. ChargeProcessor
- Executes payment processing and token transfers
- Handles both regular charges and signed quote payments
- Manages platform fees and merchant payouts
- Enforces spending caps and security measures

## 🛠️ Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Yarn or npm
- Private key with testnet/mainnet funds

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd crypto-subscription

# Install dependencies
yarn install

# Compile contracts
yarn compile
```

### Local Development

```bash
# Start local Hardhat node
yarn node

# In another terminal, deploy contracts
yarn deploy:local
```

### Testnet Deployment

```bash
# Deploy to Amoy testnet
yarn deploy:amoy

# Verify contracts
yarn verify:amoy

# Initialize with default settings
yarn initialize:amoy
```

### Mainnet Deployment

```bash
# Deploy to Polygon mainnet
yarn deploy:polygon

# Verify contracts
yarn verify:polygon

# Initialize with production settings
yarn initialize:polygon
```

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run specific test files
yarn test test/PlanRegistry.test.ts
yarn test test/SubscriptionRegistry.test.ts
yarn test test/ChargeProcessor.test.ts
```

## 📖 Usage Examples

### Creating a Plan

```typescript
// Merchant creates a plan
await planRegistry.createPlan(
  "Premium Monthly",     // Plan name
  1999,                  // $19.99 in cents
  "USD",                 // Currency
  30 * 24 * 3600,        // 30 days in seconds
  [tokenAddress]         // Allowed payment tokens
);
```

### Subscribing to a Plan

```typescript
// Subscriber subscribes to a plan
const subscriptionId = await subscriptionRegistry.subscribe(
  1,                    // Plan ID
  tokenAddress          // Payment token
);
```

### Processing a Charge

```typescript
// Regular charge
await chargeProcessor.processCharge(subscriptionId);

// Charge with signed quote (for discounts)
await chargeProcessor.processChargeWithQuote(
  subscriptionId,
  tokenAmount,
  expiry,
  invoiceId,
  signature
);
```

## 🔐 Security Features

### Domain-Bound Signatures
Signed quotes are protected against replay attacks with domain-bound signatures:

```typescript
const payload = ethers.utils.defaultAbiCoder.encode(
  ["address", "uint256", "uint256", "address", "address", "uint256", "uint256", "uint256"],
  [contractAddress, chainId, subscriptionId, subscriber, payerToken, tokenAmount, expiry, invoiceId]
);
```

### Access Controls
- Owner-only functions for critical operations
- Merchant-specific plan management
- Subscriber-only subscription controls

### Reentrancy Protection
All external calls are protected with OpenZeppelin's ReentrancyGuard.

## 🌐 Supported Networks

- **Local Development**: Hardhat (Chain ID: 31337)
- **Testnets**: Amoy (Polygon testnet, Chain ID: 80002)
- **Mainnets**: Polygon (Chain ID: 137)

## 📊 Gas Optimization

Contracts are optimized for gas efficiency:
- Solidity 0.8.28 with optimizer enabled
- 200 optimization runs
- Efficient storage patterns
- Minimal external calls

## 🔧 Configuration

### Environment Variables

```bash
# Network Configuration
NETWORK=amoy
RPC_URL=https://rpc-amoy.polygon.technology

# Private Keys (NEVER COMMIT)
AMOY_PRIVATE_KEY=your_private_key_here

# Contract Configuration
TRUSTED_SIGNER=0x0000000000000000000000000000000000000000
PLATFORM_TREASURY=0x0000000000000000000000000000000000000000
PLATFORM_FEE_BPS=100

# Verification
POLYGONSCAN_API_KEY=your_api_key_here
```

### Post-Deployment Setup

1. **Set Platform Configuration**:
   ```typescript
   await chargeProcessor.setPlatformTreasury(treasuryAddress);
   await chargeProcessor.setPlatformFee(100); // 1%
   await chargeProcessor.setTrustedSigner(signerAddress);
   ```

2. **Configure Price Feeds**:
   ```typescript
   // Chainlink price feed
   await chargeProcessor.setPriceFeed(tokenAddress, priceFeedAddress);
   
   // Or manual price
   await chargeProcessor.setManualPrice(tokenAddress, ethers.utils.parseUnits("1", 18));
   ```

3. **Set Merchant Caps**:
   ```typescript
   await chargeProcessor.setSpendCap(merchantAddress, ethers.utils.parseEther("10000"));
   ```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [API Reference](docs/) - Detailed contract documentation
- [Security Audit](audit/) - Security considerations and best practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For questions and support:
- Check the [Deployment Guide](DEPLOYMENT.md)
- Review the test files for usage examples
- Open an issue for bugs or feature requests

## 🔄 Version History

- **v1.0.0** - Initial release with core subscription functionality
- **v1.1.0** - Added signed quote support and merchant caps
- **v1.2.0** - Enhanced security and gas optimization
