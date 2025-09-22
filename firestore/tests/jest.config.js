export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/"],
  testMatch: ["**/*.test.(js|ts)"],
  transform: {
    "^.+\.ts$": "ts-jest",
    "^.+\.js$": "babel-jest",
  },
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js
: '$1',
  },
};
