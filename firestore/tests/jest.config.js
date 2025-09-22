export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/"],
  testMatch: ["**/*.test.(js|ts|mjs)"],
  extensionsToTreatAsEsm: [".ts", ".js", ".mjs"],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  transform: {
    "^.+\.ts$": "ts-jest",
    "^.+\.[mj]s$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@firebase/rules-unit-testing)/)",
  ],
};
