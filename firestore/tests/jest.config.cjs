module.exports = {
  testEnvironment: "node",
  transform: {}, // desactivar babel-jest, usamos Node puro
  testMatch: ["**/firestore/tests/**/*.test.js"],
  verbose: true,
};
