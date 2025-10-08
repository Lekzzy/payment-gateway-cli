# Deployment Guide

This guide covers how to deploy the Crypto Subscription contracts to various networks.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Yarn** or **npm**
3. **Hardhat** (already included in dependencies)
4. **Private key** with sufficient funds for deployment
5. **RPC URL** for the target network
6. **API keys** for contract verification (optional but recommended)

## Environment Setup

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables:**
   ```bash
   # Network Configuration
   NETWORK=amoy
   RPC_URL=https://rpc-amoy.polygon.technology
   
   # Private Keys (DO NOT COMMIT REAL PRIVATE KEYS)
   AMOY_PRIVATE_KEY=your_amoy_private_key_here
   
   # Contract Configuration
   TRUSTED_SIGNER=0x0000000000000000000000000000000000000000
   PLATFORM_TREASURY=0x0000000000000000000000000000000000000000
   PLATFORM_FEE_BPS=100
   
   # Verification
   POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
   ```

## Supported Networks

### Testnets
- **Amoy** (Polygon testnet) - Chain ID: 80002
- **Hardhat** (local development) - Chain ID: 31337

### Mainnets
- **Polygon** - Chain ID: 137

## Deployment Process

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Run Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/PlanRegistry.test.ts
npx hardhat test test/SubscriptionRegistry.test.ts
npx hardhat test test/ChargeProcessor.test.ts
```

### 3. Deploy Contracts

#### Local Development (Hardhat)

```bash
# Start local node
npx hardhat node

# In another terminal, deploy to local network
npx hardhat run scripts/deploy.ts --network hardhat
```

#### Testnet (Amoy)

```bash
npx hardhat run scripts/deploy.ts --network amoy
```

#### Mainnet (Polygon)

```bash
npx hardhat run scripts/deploy.ts --network polygon
```

### 4. Verify Contracts

```bash
# Verify on testnet
npx hardhat run scripts/verify.ts --network amoy

# Verify on mainnet
npx hardhat run scripts/verify.ts --network polygon
```

### 5. Initialize Contracts

```bash
# Initialize contracts with default configuration
npx hardhat run scripts/initialize.ts --network amoy
```

## Deployment Scripts

### `scripts/deploy.ts`
Main deployment script that:
- Deploys all contracts in correct order
- Initializes contract relationships
- Sets up platform configuration
- Saves deployment information to JSON file

### `scripts/verify.ts`
Contract verification script that:
- Reads deployment information
- Verifies contracts on block explorer
- Handles already verified contracts gracefully

### `scripts/initialize.ts`
Post-deployment initialization that:
- Verifies contract connections
- Sets up default configuration
- Creates example plans
- Displays final configuration

## Contract Deployment Order

1. **PlanRegistry** - No dependencies
2. **SubscriptionRegistry** - Depends on PlanRegistry
3. **ChargeProcessor** - Depends on both PlanRegistry and SubscriptionRegistry

## Post-Deployment Configuration

After deployment, you may need to configure:

### 1. Platform Settings
```typescript
// Set platform treasury
await chargeProcessor.setPlatformTreasury(treasuryAddress);

// Set platform fee (in basis points, e.g., 100 = 1%)
await chargeProcessor.setPlatformFee(100);

// Set trusted signer for quote validation
await chargeProcessor.setTrustedSigner(signerAddress);
```

### 2. Price Feeds
```typescript
// Set Chainlink price feed for a token
await chargeProcessor.setPriceFeed(tokenAddress, priceFeedAddress);

// Or set manual price (in 18 decimals)
await chargeProcessor.setManualPrice(tokenAddress, ethers.utils.parseUnits("1", 18));
```

### 3. Merchant Spend Caps
```typescript
// Set spend cap for a merchant (per 30-day period)
await chargeProcessor.setSpendCap(merchantAddress, ethers.utils.parseEther("10000"));
```

## Gas Optimization

The contracts are compiled with the following optimizations:
- **Optimizer enabled**: true
- **Runs**: 200
- **Solidity version**: 0.8.28

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **Environment Variables**: Use `.env` files and add them to `.gitignore`
3. **Verification**: Always verify contracts on block explorers
4. **Testing**: Run comprehensive tests before mainnet deployment
5. **Access Control**: Ensure proper ownership and access control setup

## Troubleshooting

### Common Issues

1. **Insufficient Funds**
   ```
   Error: insufficient funds for gas * price + value
   ```
   Solution: Ensure your account has enough ETH/MATIC for gas fees

2. **Network Connection Issues**
   ```
   Error: could not detect network
   ```
   Solution: Check your RPC URL and network configuration

3. **Verification Failures**
   ```
   Error: Contract source code already verified
   ```
   Solution: This is normal - the contract is already verified

4. **Constructor Arguments Mismatch**
   ```
   Error: The constructor arguments provided do not match the contract
   ```
   Solution: Check that constructor arguments match the deployment

### Getting Help

1. Check the [Hardhat documentation](https://hardhat.org/docs)
2. Review contract source code and tests
3. Check network status and RPC provider status
4. Verify environment variables are set correctly

## Monitoring

After deployment, monitor:

1. **Contract Events**: Listen for important events like `PlanCreated`, `Subscribed`, `ChargeSucceeded`
2. **Gas Usage**: Monitor gas consumption for optimization
3. **Error Rates**: Track failed transactions and their reasons
4. **Platform Fees**: Monitor fee collection and distribution

## Upgrades

The current contracts are not upgradeable. For upgrades, you would need to:
1. Deploy new contract versions
2. Migrate data (if needed)
3. Update frontend integrations
4. Notify users of changes

## Support

For technical support or questions:
1. Check the test files for usage examples
2. Review the contract documentation in the source code
3. Check the README.md for general information
