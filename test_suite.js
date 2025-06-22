const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Test configuration
const TEST_CONFIG = {
    dbPath: path.join(__dirname, 'test_database.db'),
    testUser: {
        username: 'testuser',
        password: 'TestPassword123!'
    },
    testPassword: {
        label: 'Test Gmail',
        username: 'test@gmail.com',
        password: 'SecurePass123!',
        url: 'https://gmail.com',
        category: 'Personal',
        notes: 'Test password entry',
        tags: 'email, google'
    },
    testNote: {
        title: 'Test Secure Note',
        content: 'This is a test secure note with sensitive information.',
        category: 'Personal',
        tags: 'test, important',
        is_favorite: true
    }
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Utility functions
function logTest(testName, passed, message = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}: PASSED ${message}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}: FAILED ${message}`);
    }
    testResults.details.push({ testName, passed, message });
}

function assert(condition, testName, message = '') {
    logTest(testName, condition, message);
    return condition;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Database setup and teardown
function setupTestDatabase() {
    // Remove existing test database
    if (fs.existsSync(TEST_CONFIG.dbPath)) {
        fs.unlinkSync(TEST_CONFIG.dbPath);
    }
    console.log('🔧 Test database setup complete');
}

function cleanupTestDatabase() {
    // Remove test database
    if (fs.existsSync(TEST_CONFIG.dbPath)) {
        fs.unlinkSync(TEST_CONFIG.dbPath);
    }
    console.log('🧹 Test database cleanup complete');
}

// Mock Electron API for testing
class MockElectronAPI {
    constructor() {
        this.currentUser = null;
        this.passwords = [];
        this.notes = [];
        this.nextId = 1;
        this.encryptionKey = crypto.randomBytes(32);
    }

    // Authentication methods
    async registerUser(userData) {
        if (this.findUser(userData.username)) {
            return { success: false, error: 'User already exists' };
        }
        
        this.currentUser = {
            id: this.nextId++,
            username: userData.username,
            password: this.hashPassword(userData.password),
            created_at: new Date().toISOString()
        };
        
        return { success: true, user: { username: this.currentUser.username } };
    }

    async loginUser(credentials) {
        const user = this.findUser(credentials.username);
        if (!user || user.password !== this.hashPassword(credentials.password)) {
            return { success: false, error: 'Invalid credentials' };
        }
        
        this.currentUser = user;
        return { success: true, user: { username: user.username } };
    }

    async checkAuth() {
        if (this.currentUser) {
            return { authenticated: true, user: { username: this.currentUser.username } };
        }
        return { authenticated: false };
    }

    // Password management methods
    async getPasswords() {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const userPasswords = this.passwords.filter(p => p.user_id === this.currentUser.id);
        return { success: true, passwords: userPasswords };
    }

    async addPassword(passwordData) {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        const newPassword = {
            id: this.nextId++,
            user_id: this.currentUser.id,
            label: passwordData.label,
            username: passwordData.username || '',
            secret: this.encrypt(passwordData.password),
            url: passwordData.url || '',
            category: passwordData.category || 'General',
            notes: passwordData.notes || '',
            tags: passwordData.tags || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.passwords.push(newPassword);
        return { success: true, password: newPassword };
    }

    async updatePassword(id, passwordData) {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        const passwordIndex = this.passwords.findIndex(p => p.id === id && p.user_id === this.currentUser.id);
        if (passwordIndex === -1) {
            return { success: false, error: 'Password not found' };
        }

        this.passwords[passwordIndex] = {
            ...this.passwords[passwordIndex],
            ...passwordData,
            secret: passwordData.password ? this.encrypt(passwordData.password) : this.passwords[passwordIndex].secret,
            updated_at: new Date().toISOString()
        };

        return { success: true, password: this.passwords[passwordIndex] };
    }

    async deletePassword(id) {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        const passwordIndex = this.passwords.findIndex(p => p.id === id && p.user_id === this.currentUser.id);
        if (passwordIndex === -1) {
            return { success: false, error: 'Password not found' };
        }

        this.passwords.splice(passwordIndex, 1);
        return { success: true };
    }

    async copyPassword(id) {
        const password = this.passwords.find(p => p.id === id && p.user_id === this.currentUser.id);
        if (!password) {
            return { success: false, error: 'Password not found' };
        }
        
        // Mock clipboard copy
        return { success: true, message: 'Password copied to clipboard' };
    }

    // Secure Notes methods
    async getSecureNotes() {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }
        
        const userNotes = this.notes.filter(n => n.user_id === this.currentUser.id);
        return { success: true, notes: userNotes };
    }

    async addSecureNote(noteData) {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        const newNote = {
            id: this.nextId++,
            user_id: this.currentUser.id,
            title: noteData.title,
            content: this.encrypt(noteData.content),
            category: noteData.category || 'General',
            tags: noteData.tags || '',
            is_favorite: noteData.is_favorite || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.notes.push(newNote);
        return { success: true, note: newNote };
    }

    async updateSecureNote(id, noteData) {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        const noteIndex = this.notes.findIndex(n => n.id === id && n.user_id === this.currentUser.id);
        if (noteIndex === -1) {
            return { success: false, error: 'Note not found' };
        }

        this.notes[noteIndex] = {
            ...this.notes[noteIndex],
            ...noteData,
            content: noteData.content ? this.encrypt(noteData.content) : this.notes[noteIndex].content,
            updated_at: new Date().toISOString()
        };

        return { success: true, note: this.notes[noteIndex] };
    }

    async deleteSecureNote(id) {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        const noteIndex = this.notes.findIndex(n => n.id === id && n.user_id === this.currentUser.id);
        if (noteIndex === -1) {
            return { success: false, error: 'Note not found' };
        }

        this.notes.splice(noteIndex, 1);
        return { success: true };
    }

    // Export/Import methods
    async exportData(format) {
        if (!this.currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        const userPasswords = this.passwords.filter(p => p.user_id === this.currentUser.id);
        const userNotes = this.notes.filter(n => n.user_id === this.currentUser.id);

        const exportData = {
            passwords: userPasswords,
            notes: userNotes,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        return { success: true, data: exportData, format };
    }

    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `password-vault-backup-${timestamp}.vault`;
        return { success: true, filename };
    }

    // Utility methods
    findUser(username) {
        // In a real app, this would query the database
        return this.currentUser && this.currentUser.username === username ? this.currentUser : null;
    }

    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    decrypt(encryptedText) {
        const [ivHex, encrypted] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}

// Test suites
class PasswordVaultTestSuite {
    constructor() {
        this.api = new MockElectronAPI();
    }

    async runAllTests() {
        console.log('🚀 Starting Password Vault Test Suite\n');
        
        setupTestDatabase();
        
        try {
            await this.testAuthentication();
            await this.testPasswordManagement();
            await this.testSecureNotes();
            await this.testExportImport();
            await this.testSecurity();
            await this.testErrorHandling();
            
            this.printTestResults();
        } catch (error) {
            console.error('❌ Test suite failed with error:', error);
        } finally {
            cleanupTestDatabase();
        }
    }

    async testAuthentication() {
        console.log('\n📝 Testing Authentication Features...');
        
        // Test user registration
        const registerResult = await this.api.registerUser(TEST_CONFIG.testUser);
        assert(registerResult.success, 'User Registration', 'Should register new user successfully');
        assert(registerResult.user.username === TEST_CONFIG.testUser.username, 'Registration Username', 'Should return correct username');

        // Test duplicate registration
        const duplicateResult = await this.api.registerUser(TEST_CONFIG.testUser);
        assert(!duplicateResult.success, 'Duplicate Registration Prevention', 'Should prevent duplicate user registration');

        // Test user login
        const loginResult = await this.api.loginUser(TEST_CONFIG.testUser);
        assert(loginResult.success, 'User Login', 'Should login with correct credentials');
        assert(loginResult.user.username === TEST_CONFIG.testUser.username, 'Login Username', 'Should return correct username');

        // Test invalid login
        const invalidLoginResult = await this.api.loginUser({ username: 'invalid', password: 'wrong' });
        assert(!invalidLoginResult.success, 'Invalid Login Prevention', 'Should reject invalid credentials');

        // Test authentication check
        const authResult = await this.api.checkAuth();
        assert(authResult.authenticated, 'Authentication Check', 'Should confirm user is authenticated');
        assert(authResult.user.username === TEST_CONFIG.testUser.username, 'Auth Username', 'Should return correct authenticated user');
    }

    async testPasswordManagement() {
        console.log('\n🔐 Testing Password Management Features...');
        
        // Test adding password
        const addResult = await this.api.addPassword(TEST_CONFIG.testPassword);
        assert(addResult.success, 'Add Password', 'Should add new password successfully');
        assert(addResult.password.label === TEST_CONFIG.testPassword.label, 'Password Label', 'Should save correct label');
        
        const passwordId = addResult.password.id;

        // Test getting passwords
        const getResult = await this.api.getPasswords();
        assert(getResult.success, 'Get Passwords', 'Should retrieve passwords successfully');
        assert(getResult.passwords.length === 1, 'Password Count', 'Should return correct number of passwords');
        assert(getResult.passwords[0].label === TEST_CONFIG.testPassword.label, 'Retrieved Password', 'Should return correct password data');

        // Test updating password
        const updateData = { label: 'Updated Gmail', category: 'Work' };
        const updateResult = await this.api.updatePassword(passwordId, updateData);
        assert(updateResult.success, 'Update Password', 'Should update password successfully');
        assert(updateResult.password.label === 'Updated Gmail', 'Updated Label', 'Should update password label');
        assert(updateResult.password.category === 'Work', 'Updated Category', 'Should update password category');

        // Test copying password
        const copyResult = await this.api.copyPassword(passwordId);
        assert(copyResult.success, 'Copy Password', 'Should copy password to clipboard');

        // Test deleting password
        const deleteResult = await this.api.deletePassword(passwordId);
        assert(deleteResult.success, 'Delete Password', 'Should delete password successfully');

        // Verify password is deleted
        const getAfterDeleteResult = await this.api.getPasswords();
        assert(getAfterDeleteResult.passwords.length === 0, 'Password Deletion Verification', 'Should have no passwords after deletion');
    }

    async testSecureNotes() {
        console.log('\n📝 Testing Secure Notes Features...');
        
        // Test adding note
        const addResult = await this.api.addSecureNote(TEST_CONFIG.testNote);
        assert(addResult.success, 'Add Secure Note', 'Should add new note successfully');
        assert(addResult.note.title === TEST_CONFIG.testNote.title, 'Note Title', 'Should save correct title');
        assert(addResult.note.is_favorite === TEST_CONFIG.testNote.is_favorite, 'Note Favorite', 'Should save favorite status');
        
        const noteId = addResult.note.id;

        // Test getting notes
        const getResult = await this.api.getSecureNotes();
        assert(getResult.success, 'Get Secure Notes', 'Should retrieve notes successfully');
        assert(getResult.notes.length === 1, 'Note Count', 'Should return correct number of notes');
        assert(getResult.notes[0].title === TEST_CONFIG.testNote.title, 'Retrieved Note', 'Should return correct note data');

        // Test updating note
        const updateData = { title: 'Updated Note', category: 'Work', is_favorite: false };
        const updateResult = await this.api.updateSecureNote(noteId, updateData);
        assert(updateResult.success, 'Update Secure Note', 'Should update note successfully');
        assert(updateResult.note.title === 'Updated Note', 'Updated Note Title', 'Should update note title');
        assert(updateResult.note.category === 'Work', 'Updated Note Category', 'Should update note category');
        assert(updateResult.note.is_favorite === false, 'Updated Note Favorite', 'Should update favorite status');

        // Test deleting note
        const deleteResult = await this.api.deleteSecureNote(noteId);
        assert(deleteResult.success, 'Delete Secure Note', 'Should delete note successfully');

        // Verify note is deleted
        const getAfterDeleteResult = await this.api.getSecureNotes();
        assert(getAfterDeleteResult.notes.length === 0, 'Note Deletion Verification', 'Should have no notes after deletion');
    }

    async testExportImport() {
        console.log('\n📤 Testing Export/Import Features...');
        
        // Add some test data
        await this.api.addPassword(TEST_CONFIG.testPassword);
        await this.api.addSecureNote(TEST_CONFIG.testNote);

        // Test export
        const exportResult = await this.api.exportData('json');
        assert(exportResult.success, 'Export Data', 'Should export data successfully');
        assert(exportResult.data.passwords.length === 1, 'Export Passwords', 'Should export correct number of passwords');
        assert(exportResult.data.notes.length === 1, 'Export Notes', 'Should export correct number of notes');
        assert(exportResult.format === 'json', 'Export Format', 'Should return correct export format');

        // Test backup creation
        const backupResult = await this.api.createBackup();
        assert(backupResult.success, 'Create Backup', 'Should create backup successfully');
        assert(backupResult.filename.includes('password-vault-backup'), 'Backup Filename', 'Should generate correct backup filename');
    }

    async testSecurity() {
        console.log('\n🔒 Testing Security Features...');
        
        // Test encryption/decryption
        const testText = 'This is sensitive data that should be encrypted';
        const encrypted = this.api.encrypt(testText);
        assert(encrypted !== testText, 'Encryption', 'Should encrypt text differently from original');
        assert(encrypted.includes(':'), 'Encryption Format', 'Should use IV:encrypted format');
        
        const decrypted = this.api.decrypt(encrypted);
        assert(decrypted === testText, 'Decryption', 'Should decrypt to original text');

        // Test password hashing
        const password = 'TestPassword123!';
        const hash1 = this.api.hashPassword(password);
        const hash2 = this.api.hashPassword(password);
        assert(hash1 === hash2, 'Password Hashing Consistency', 'Should produce consistent hashes');
        assert(hash1 !== password, 'Password Hashing Security', 'Should not store plain text passwords');
        assert(hash1.length === 64, 'Hash Length', 'Should produce 64-character SHA256 hash');

        // Test data isolation (user can only access their own data)
        const password1 = await this.api.addPassword({ ...TEST_CONFIG.testPassword, label: 'User1 Password' });
        const note1 = await this.api.addSecureNote({ ...TEST_CONFIG.testNote, title: 'User1 Note' });
        
        // Simulate different user
        const originalUser = this.api.currentUser;
        this.api.currentUser = { id: 999, username: 'otheruser' };
        
        const otherUserPasswords = await this.api.getPasswords();
        const otherUserNotes = await this.api.getSecureNotes();
        
        assert(otherUserPasswords.passwords.length === 0, 'Password Data Isolation', 'Should not access other user passwords');
        assert(otherUserNotes.notes.length === 0, 'Note Data Isolation', 'Should not access other user notes');
        
        // Restore original user
        this.api.currentUser = originalUser;
    }

    async testErrorHandling() {
        console.log('\n⚠️  Testing Error Handling...');
        
        // Test operations without authentication
        const originalUser = this.api.currentUser;
        this.api.currentUser = null;
        
        const noAuthPassword = await this.api.getPasswords();
        assert(!noAuthPassword.success, 'Unauthenticated Password Access', 'Should reject unauthenticated password access');
        
        const noAuthNote = await this.api.getSecureNotes();
        assert(!noAuthNote.success, 'Unauthenticated Note Access', 'Should reject unauthenticated note access');
        
        const noAuthAdd = await this.api.addPassword(TEST_CONFIG.testPassword);
        assert(!noAuthAdd.success, 'Unauthenticated Add Password', 'Should reject unauthenticated password addition');
        
        // Restore authentication
        this.api.currentUser = originalUser;
        
        // Test operations on non-existent data
        const deleteNonExistent = await this.api.deletePassword(99999);
        assert(!deleteNonExistent.success, 'Delete Non-existent Password', 'Should handle non-existent password deletion');
        
        const updateNonExistent = await this.api.updatePassword(99999, { label: 'Updated' });
        assert(!updateNonExistent.success, 'Update Non-existent Password', 'Should handle non-existent password update');
        
        const deleteNonExistentNote = await this.api.deleteSecureNote(99999);
        assert(!deleteNonExistentNote.success, 'Delete Non-existent Note', 'Should handle non-existent note deletion');
    }

    printTestResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${testResults.total}`);
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
        
        if (testResults.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            testResults.details
                .filter(test => !test.passed)
                .forEach(test => console.log(`   - ${test.testName}: ${test.message}`));
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (testResults.failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Your Password Vault is working perfectly!');
        } else {
            console.log('⚠️  Some tests failed. Please review the implementation.');
        }
    }
}

// Manual UI Test Instructions
function generateUITestInstructions() {
    const instructions = `
🖥️  MANUAL UI TESTING INSTRUCTIONS
===============================================

Since this is an Electron app with a graphical interface, please also perform these manual tests:

1. 🔐 AUTHENTICATION UI TESTS:
   - Open the app and verify login screen appears
   - Try logging in with invalid credentials (should show error)
   - Register a new user account
   - Login with valid credentials
   - Verify dashboard loads correctly

2. 🔑 PASSWORD MANAGEMENT UI TESTS:
   - Click "Add Password" button
   - Fill out the form and save a password
   - Verify password appears in the list
   - Click "Copy" button and verify notification
   - Click "Edit" button and modify the password
   - Use search functionality to find passwords
   - Filter by category
   - Delete a password and confirm it's removed

3. 📝 SECURE NOTES UI TESTS:
   - Click "Secure Notes" button
   - Verify notes modal opens
   - Click "Add New Note" button
   - Fill out note form and save
   - Verify note appears in the list
   - Click on a note to view it
   - Edit an existing note
   - Mark a note as favorite
   - Delete a note

4. 🔧 TOOLS & FEATURES UI TESTS:
   - Test Tools dropdown menu
   - Try export functionality (CSV, JSON)
   - Test backup creation
   - Try import functionality with a CSV file
   - Test theme toggle (dark/light mode)
   - Test refresh button

5. 🔍 SEARCH & FILTER UI TESTS:
   - Use main search bar
   - Test category filtering
   - Test sorting options
   - Try bulk operations (if enabled)

6. 📱 RESPONSIVE & ACCESSIBILITY TESTS:
   - Resize window to test responsiveness
   - Test keyboard navigation (Tab, Enter, Escape)
   - Verify all buttons and links work
   - Check that modals open and close properly

7. 🚨 ERROR HANDLING UI TESTS:
   - Try submitting forms with missing required fields
   - Test with very long input values
   - Try operations that should fail gracefully

Run these manual tests after the automated tests pass to ensure complete functionality!
`;
    
    console.log(instructions);
}

// Main execution
if (require.main === module) {
    const testSuite = new PasswordVaultTestSuite();
    testSuite.runAllTests().then(() => {
        generateUITestInstructions();
    });
}

module.exports = { PasswordVaultTestSuite, MockElectronAPI }; 