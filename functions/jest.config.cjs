module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.spec.ts"],
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  transform: {
    "^.+\.ts$": "ts-jest",
    "^.+\.js$": "babel-jest",
  },
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js: '$1',
  },
};