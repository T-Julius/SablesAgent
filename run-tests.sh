#!/bin/bash

# Run tests for the Zimbabwe Sables Rugby Team document management system
# This script runs all tests and generates coverage reports

# Set environment to test
export NODE_ENV=test

# Install dependencies if needed
echo "Checking dependencies..."
npm install

# Run backend tests
echo "Running backend tests..."
npm test

# Run frontend tests
echo "Running frontend tests..."
npm run test:frontend

# Run end-to-end tests
echo "Running end-to-end tests..."
npm run test:e2e

# Generate combined coverage report
echo "Generating coverage report..."
npx nyc report --reporter=text-summary

echo "Testing completed!"
