module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      // ts-jest configuration goes here
      useESM: true,
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};