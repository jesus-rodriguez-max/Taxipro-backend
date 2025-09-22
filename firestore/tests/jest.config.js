export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/"],
  testMatch: ["**/*.test.(js|ts)"],
  extensionsToTreatAsEsm: [".ts", ".js"],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  transform: {
    "^.+\.ts$": "ts-jest",
    "^.+\.js$": "babel-jest",
  },
};
