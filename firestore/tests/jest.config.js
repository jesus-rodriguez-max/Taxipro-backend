export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/"],
  testMatch: ["**/*.test.(js|ts)"],
  transform: {
    "^.+\.[jt]s$": "ts-jest",
  },
};
