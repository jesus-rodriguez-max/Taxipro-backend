module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.spec.ts"],
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  transform: {
    "^.+\.ts$": "ts-jest",
  },
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js: '$1',
  },
};