#!/usr/bin/env node

const { PasswordVaultTestSuite } = require('./test_suite.js');

console.log('🧪 Password Vault Test Runner');
console.log('=============================\n');

async function runTests() {
    try {
        const testSuite = new PasswordVaultTestSuite();
        await testSuite.runAllTests();
        process.exit(0);
    } catch (error) {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    }
}

runTests(); 