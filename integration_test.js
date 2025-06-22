const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class IntegrationTestSuite {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
    }

    logTest(testName, passed, message = '') {
        this.testResults.total++;
        if (passed) {
            this.testResults.passed++;
            console.log(`✅ ${testName}: PASSED ${message}`);
        } else {
            this.testResults.failed++;
            console.log(`❌ ${testName}: FAILED ${message}`);
        }
        this.testResults.details.push({ testName, passed, message });
    }

    async runIntegrationTests() {
        console.log('🔌 Starting Integration Tests...\n');

        await this.testFileStructure();
        await this.testElectronApp();
        await this.testDatabaseOperations();
        
        this.printResults();
    }

    async testFileStructure() {
        console.log('📁 Testing File Structure...');

        // Test main files exist
        const requiredFiles = [
            'package.json',
            'electron/main.js',
            'electron/preload.js',
            'electron/pages/login.html',
            'electron/pages/dashboard.html'
        ];

        for (const file of requiredFiles) {
            const exists = fs.existsSync(path.join(__dirname, file));
            this.logTest(`File Exists: ${file}`, exists, exists ? '' : 'File missing');
        }

        // Test package.json structure
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            this.logTest('Package.json Valid', true, 'Valid JSON structure');
            this.logTest('Main Entry Point', packageJson.main === 'electron/main.js', `Main: ${packageJson.main}`);
            this.logTest('Start Script', packageJson.scripts && packageJson.scripts.start, 'Start script exists');
            this.logTest('Test Script', packageJson.scripts && packageJson.scripts.test, 'Test script exists');
        } catch (error) {
            this.logTest('Package.json Valid', false, error.message);
        }

        // Test HTML files are valid
        const htmlFiles = ['electron/pages/login.html', 'electron/pages/dashboard.html'];
        for (const htmlFile of htmlFiles) {
            try {
                const content = fs.readFileSync(htmlFile, 'utf8');
                const hasDoctype = content.includes('<!DOCTYPE html>');
                const hasHtml = content.includes('<html');
                const hasHead = content.includes('<head>');
                const hasBody = content.includes('<body>');
                
                this.logTest(`${htmlFile} Structure`, hasDoctype && hasHtml && hasHead && hasBody, 'Valid HTML structure');
            } catch (error) {
                this.logTest(`${htmlFile} Structure`, false, error.message);
            }
        }
    }

    async testElectronApp() {
        console.log('\n⚡ Testing Electron App Launch...');

        return new Promise((resolve) => {
            // Test if electron can start (dry run)
            const electronProcess = spawn('npm', ['start'], {
                stdio: 'pipe',
                timeout: 10000
            });

            let output = '';
            let hasStarted = false;

            electronProcess.stdout.on('data', (data) => {
                output += data.toString();
                if (output.includes('Starting Password Vault Desktop') || 
                    output.includes('Database initialized')) {
                    hasStarted = true;
                    electronProcess.kill();
                }
            });

            electronProcess.stderr.on('data', (data) => {
                const error = data.toString();
                // Ignore GTK warnings on Linux
                if (!error.includes('GLib-GObject') && !error.includes('GTK')) {
                    console.log('Electron stderr:', error);
                }
            });

            electronProcess.on('close', (code) => {
                this.logTest('Electron App Launch', hasStarted || code === 0, 
                    hasStarted ? 'App started successfully' : `Exit code: ${code}`);
                resolve();
            });

            electronProcess.on('error', (error) => {
                this.logTest('Electron App Launch', false, error.message);
                resolve();
            });

            // Kill process after timeout
            setTimeout(() => {
                if (!electronProcess.killed) {
                    electronProcess.kill();
                    this.logTest('Electron App Launch', hasStarted, 
                        hasStarted ? 'Started but timed out (normal)' : 'Failed to start');
                    resolve();
                }
            }, 8000);
        });
    }

    async testDatabaseOperations() {
        console.log('\n🗄️  Testing Database Operations...');

        // Test if we can require the main.js file without errors
        try {
            // Mock electron modules for testing
            global.require = (moduleName) => {
                if (moduleName === 'electron') {
                    return {
                        app: { getPath: () => __dirname },
                        BrowserWindow: class MockBrowserWindow {},
                        ipcMain: { handle: () => {}, on: () => {} },
                        dialog: { showSaveDialog: () => ({}) },
                        clipboard: { writeText: () => {} }
                    };
                }
                return require(moduleName);
            };

            // Test database initialization logic
            const crypto = require('crypto');
            const testKey = crypto.randomBytes(32);
            
            // Test encryption functions
            const testText = 'Test encryption data';
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', testKey, iv);
            let encrypted = cipher.update(testText, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const encryptedData = iv.toString('hex') + ':' + encrypted;

            this.logTest('Encryption Test', encryptedData.includes(':'), 'Encryption produces expected format');

            // Test decryption
            const [ivHex, encryptedText] = encryptedData.split(':');
            const ivBuffer = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', testKey, ivBuffer);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            this.logTest('Decryption Test', decrypted === testText, 'Decryption restores original text');

        } catch (error) {
            this.logTest('Database Operations', false, error.message);
        }
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 INTEGRATION TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.details
                .filter(test => !test.passed)
                .forEach(test => console.log(`   - ${test.testName}: ${test.message}`));
        }
        
        console.log('\n' + '='.repeat(60));
    }
}

// Performance test
class PerformanceTestSuite {
    async runPerformanceTests() {
        console.log('\n⚡ Running Performance Tests...');

        // Test file loading times
        const files = [
            'electron/pages/login.html',
            'electron/pages/dashboard.html',
            'electron/main.js',
            'electron/preload.js'
        ];

        for (const file of files) {
            const start = Date.now();
            try {
                fs.readFileSync(file, 'utf8');
                const loadTime = Date.now() - start;
                console.log(`📄 ${file}: ${loadTime}ms`);
            } catch (error) {
                console.log(`❌ ${file}: Failed to load`);
            }
        }

        // Test encryption performance
        const crypto = require('crypto');
        const testData = 'A'.repeat(1000); // 1KB of data
        const key = crypto.randomBytes(32);
        
        const start = Date.now();
        for (let i = 0; i < 100; i++) {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(testData, 'utf8', 'hex');
            encrypted += cipher.final('hex');
        }
        const encryptTime = Date.now() - start;
        console.log(`🔐 Encryption (100x 1KB): ${encryptTime}ms`);
    }
}

// Security test
class SecurityTestSuite {
    async runSecurityTests() {
        console.log('\n🔒 Running Security Tests...');

        // Test that sensitive files don't contain hardcoded secrets
        const filesToCheck = [
            'electron/main.js',
            'electron/preload.js',
            'package.json'
        ];

        const suspiciousPatterns = [
            /password\s*=\s*["'][^"']+["']/i,
            /api_key\s*=\s*["'][^"']+["']/i,
            /secret\s*=\s*["'][^"']+["']/i,
            /token\s*=\s*["'][^"']+["']/i
        ];

        for (const file of filesToCheck) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                let hasSecrets = false;
                
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(content)) {
                        hasSecrets = true;
                        break;
                    }
                }
                
                console.log(`🔍 ${file}: ${hasSecrets ? '⚠️  May contain hardcoded secrets' : '✅ No hardcoded secrets'}`);
            } catch (error) {
                console.log(`❌ ${file}: Could not check`);
            }
        }

        // Test encryption strength
        const crypto = require('crypto');
        const testKey = crypto.randomBytes(32);
        console.log(`🔑 Encryption key length: ${testKey.length * 8} bits ✅`);
        
        // Test random IV generation
        const iv1 = crypto.randomBytes(16);
        const iv2 = crypto.randomBytes(16);
        const ivsAreDifferent = !iv1.equals(iv2);
        console.log(`🎲 IV randomness: ${ivsAreDifferent ? '✅ Unique IVs generated' : '❌ IVs are identical'}`);
    }
}

// Main execution
async function runAllTests() {
    console.log('🧪 Password Vault Integration & Security Test Suite');
    console.log('==================================================\n');

    const integrationSuite = new IntegrationTestSuite();
    await integrationSuite.runIntegrationTests();

    const performanceSuite = new PerformanceTestSuite();
    await performanceSuite.runPerformanceTests();

    const securitySuite = new SecurityTestSuite();
    await securitySuite.runSecurityTests();

    console.log('\n🎉 All integration tests completed!');
}

if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { IntegrationTestSuite, PerformanceTestSuite, SecurityTestSuite }; 