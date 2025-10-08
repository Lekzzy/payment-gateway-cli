#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

// Create necessary directories
const directories = [
  'logs',
  'tests',
  'src/config',
  'src/middleware',
  'src/routes',
  'src/utils'
];

directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('Created .env file from env.example');
  }
}

console.log('Setup completed successfully!');
