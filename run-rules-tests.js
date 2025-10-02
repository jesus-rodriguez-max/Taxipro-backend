const { execSync } = require('child_process');

const JEST_CMD = 'jest --config firestore/tests/jest.config.cjs --runInBand';

function run() {
  try {
    console.log('Running Firestore tests...');
    execSync(JEST_CMD, { stdio: 'inherit' });
    console.log('Tests passed!');
  } catch (error) {
    console.error('Tests failed.');
    process.exit(1);
  }
}

run();
