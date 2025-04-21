# Test Runner Configuration
jest.config.js

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '!**/tests/frontend/**/*.test.js'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/node_modules/**'
  ],
  verbose: true
};

# Frontend Test Configuration
jest.config.frontend.js

module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/tests/frontend/**/*.test.js'
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.vue$': '@vue/vue3-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1'
  },
  collectCoverage: true,
  coverageDirectory: 'coverage-frontend',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'frontend/src/**/*.{js,vue}',
    '!frontend/src/node_modules/**'
  ],
  verbose: true
};
