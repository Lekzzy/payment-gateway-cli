# Developer Onboarding Guide

Welcome to the Billing System CLI & SDK project! This guide will help you get up and running as a contributor or maintainer.

## 🎯 Project Overview

This project provides a comprehensive billing system with:
- **CLI Tools**: Command-line interface for billing operations
- **Node.js SDK**: TypeScript SDK for integration
- **Discord Integration**: Automatic role management
- **API Server**: RESTful API with test endpoints
- **Mock Services**: Development and testing utilities

## 🏗️ Architecture

### Project Structure
```
payment-gateway-cli/
├── src/
│   ├── cli/                 # CLI commands and interface
│   ├── sdk/                 # Node.js SDK
│   ├── api/                 # API server and endpoints
│   ├── discord/             # Discord integration
│   ├── telegram/            # Telegram integration
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Shared utilities
│   └── tests/               # Test suites
├── docs/                    # Documentation
├── dist/                    # Compiled JavaScript (generated)
└── package.json
```

### Key Components

#### CLI (`src/cli/`)
- **index.ts**: Main CLI entry point with Commander.js
- **commands/**: Individual command implementations
- **plan.ts**: Plan management commands
- **invoice.ts**: Invoice operations
- **refund.ts**: Refund processing
- **webhook.ts**: Webhook utilities
- **discord.ts**: Discord integration commands

#### SDK (`src/sdk/`)
- **client.ts**: Main BillingClient class
- **resources/**: Resource-specific classes
- **index.ts**: SDK exports and types

#### API (`src/api/`)
- **server.ts**: Main API server
- **test-server.ts**: Test API server with mock data
- **routes/**: API route handlers

#### Discord (`src/discord/`)
- **client.ts**: Discord bot client and role management
- **webhook-listener.ts**: Webhook event processor
- **config.ts**: Configuration management

#### Types (`src/types/`)
- **index.ts**: Core type definitions
- Shared interfaces for Plans, Invoices, Refunds, etc.

#### Utils (`src/utils/`)
- **mock-api.ts**: Mock API service for development
- **webhook.ts**: Webhook verification utilities
- **fixtures.ts**: Test data and fixtures

## 🚀 Development Setup

### Prerequisites
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **TypeScript**: Installed globally (`npm install -g typescript`)
- **Git**: For version control

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd payment-gateway-cli

# Install dependencies
npm install

# Build the project
npm run build

# Run tests to verify setup
npm test
```

### Development Scripts
```bash
# Development mode (with hot reload)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run tests
npm test
npm run test:watch

# Linting
npm run lint
npm run lint:fix

# Start API servers
npm run api:dev          # Main API server
npm run test:api         # Test API server

# Discord integration
npm run discord:listen   # Start webhook listener
npm run discord:test     # Test Discord connection

# Telegram integration
npm run dev -- adapter telegram init    # Configure Telegram adapter
npm run dev -- adapter telegram test    # Test Telegram adapter

# Clean build artifacts
npm run clean
```

## 🧪 Testing Strategy

### Test Structure
```
src/tests/
├── sdk.test.ts          # SDK integration tests
├── api.test.ts          # API endpoint tests
├── cli.test.ts          # CLI command tests
├── discord.test.ts      # Discord integration tests
└── utils.test.ts        # Utility function tests
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- sdk.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Data
- **Fixtures**: Located in `src/utils/fixtures.ts`
- **Mock API**: Provides realistic test data
- **Test Server**: Full API server for integration testing

## 🔧 Development Workflow

### 1. Setting Up Your Environment
```bash
# Create a new branch for your feature
git checkout -b feature/your-feature-name

# Install dependencies
npm install

# Start development servers
npm run dev              # CLI development
npm run test:api         # Test API server
```

### 2. Making Changes

#### Adding a New CLI Command
1. Create command file in `src/cli/commands/`
2. Implement command logic with Commander.js
3. Add command to main CLI in `src/cli/index.ts`
4. Add tests in `src/tests/cli.test.ts`

Example:
```typescript
// src/cli/commands/example.ts
import { Command } from 'commander';

export const exampleCommand = new Command('example')
  .description('Example command')
  .option('-n, --name <name>', 'Name parameter')
  .action(async (options) => {
    console.log(`Hello, ${options.name}!`);
  });
```

#### Adding SDK Functionality
1. Add method to appropriate resource class in `src/sdk/resources/`
2. Update types in `src/types/index.ts` if needed
3. Add tests in `src/tests/sdk.test.ts`
4. Update documentation

#### Adding API Endpoints
1. Add route handler in `src/api/routes/`
2. Register route in `src/api/server.ts`
3. Add corresponding test server endpoint in `src/api/test-server.ts`
4. Add integration tests in `src/tests/api.test.ts`

### 3. Testing Your Changes
```bash
# Run relevant tests
npm test

# Test CLI commands manually
npm run dev -- plan list
npm run dev -- invoice create --help

# Test API endpoints
npm run test:api &
curl -H "X-API-Key: test_12345" http://localhost:3002/api/v1/plans

# Test Discord integration
npm run discord:test
```

### 4. Code Quality
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Check TypeScript compilation
npm run build
```

## 📝 Coding Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use proper type annotations
- Avoid `any` type unless absolutely necessary

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Error Handling
```typescript
// Good: Proper error handling
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('Operation failed:', error.message);
  throw new Error(`Failed to perform operation: ${error.message}`);
}

// Bad: Silent failures
try {
  const result = await apiCall();
  return result;
} catch (error) {
  // Silent failure
}
```

### Async/Await
```typescript
// Good: Use async/await
async function fetchData(): Promise<Data> {
  const response = await fetch('/api/data');
  return response.json();
}

// Avoid: Promise chains when async/await is clearer
function fetchData(): Promise<Data> {
  return fetch('/api/data')
    .then(response => response.json());
}
```

## 🔍 Debugging

### CLI Debugging
```bash
# Enable debug logging
DEBUG=billing:* npm run dev -- plan list

# Use Node.js debugger
node --inspect-brk dist/cli/index.js plan list
```

### API Debugging
```bash
# Start API server with debugging
DEBUG=billing:api npm run api:dev

# Use curl for API testing
curl -v -H "X-API-Key: test_12345" http://localhost:3000/api/v1/plans
```

### Discord Debugging
```bash
# Enable Discord debug logging
DEBUG=billing:discord npm run discord:listen

# Test Discord connection
npm run discord:test
```

## 📚 Key Concepts

### Configuration Management
- CLI configuration stored in `~/.billing/config.json`
- Discord configuration in `~/.billing/discord.json`
- Environment variables for sensitive data

### API Key Validation
```typescript
// API keys must follow format: test_xxx or live_xxx
const isValidApiKey = (key: string): boolean => {
  return key.startsWith('test_') || key.startsWith('live_');
};
```

### Webhook Verification
```typescript
// Always verify webhook signatures
const isValid = await webhookVerifier.verifyWebhook(
  payload,
  signature,
  timestamp,
  secret
);
```

### Resource Management
- Each resource (Plans, Invoices, Refunds) has its own class
- Consistent API patterns across all resources
- Proper error handling and validation

## 🚨 Common Issues

### TypeScript Compilation Errors
```bash
# Clear TypeScript cache
rm -rf dist/
npm run build

# Check for missing type definitions
npm install @types/node @types/express
```

### Import Path Issues
```bash
# Use path aliases defined in tsconfig.json
import { Plan } from '@types/index';
import { MockApiService } from '@utils/mock-api';
```

### Discord Permission Issues
- Ensure bot has "Manage Roles" permission
- Check role hierarchy (bot role must be higher)
- Verify guild ID is correct

### API Connection Issues
```bash
# Check if API server is running
curl http://localhost:3000/health

# Verify API key format
echo "API Key: test_12345" # Valid
echo "API Key: invalid"   # Invalid
```

## 🔄 Release Process

### Version Management
```bash
# Update version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

### Pre-release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Build successful

### Publishing
```bash
# Build for production
npm run build

# Run full test suite
npm test

# Publish to npm (if applicable)
npm publish
```

## 🤝 Contributing Guidelines

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Update documentation
7. Submit pull request

### Commit Message Format
```
type(scope): description

feat(cli): add new plan creation command
fix(sdk): resolve webhook verification issue
docs(readme): update installation instructions
test(api): add integration tests for refunds
```

### Code Review Checklist
- [ ] Code follows project standards
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance considerations addressed

## 📞 Getting Help

### Resources
- **Documentation**: Check the `docs/` directory
- **Examples**: Look at `docs/examples/`
- **Tests**: Review test files for usage patterns
- **Issues**: Search existing issues in the project tracker

### Communication
- **Community Forum**: For questions and ideas
- **Discord**: For real-time community support

### Debugging Resources
- **Node.js Debugging**: https://nodejs.org/en/docs/guides/debugging-getting-started/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Commander.js Docs**: https://github.com/tj/commander.js
- **Discord.js Guide**: https://discordjs.guide/

## 🎓 Learning Path

### For New Contributors
1. **Start Here**: Read this onboarding guide
2. **Explore**: Run CLI commands and explore the codebase
3. **Test**: Run the test suite and understand test patterns
4. **Practice**: Make a small change and test it
5. **Contribute**: Pick up a "good first issue"

### For Advanced Contributors
1. **Architecture**: Understand the overall system design
2. **Performance**: Learn about optimization opportunities
3. **Security**: Understand security considerations
4. **Scalability**: Consider how features scale

### Recommended Reading
- TypeScript best practices
- Node.js security guidelines
- REST API design principles
- Discord bot development
- Webhook security patterns

---

Welcome to the team! 🎉 We're excited to have you contribute to this project. If you have any questions, don't hesitate to ask in our community channels.