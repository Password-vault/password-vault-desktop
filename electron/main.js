const { app, BrowserWindow, Menu, dialog, shell, ipcMain, clipboard, Notification } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const MemoryConfig = require('../memory-config');

// Initialize memory configuration
const memoryConfig = new MemoryConfig();
memoryConfig.printConfiguration();

// Keep a global reference of the window object
let mainWindow;
let db;
let currentUser = null;
let encryptionKey = null;

// Initialize database and encryption key on startup
app.whenReady().then(async () => {
  try {
    // Initialize paths first
    initializePaths();
    console.log('[INFO] Paths initialized');
    
    // Load encryption key first
    encryptionKey = loadOrCreateKey();
    console.log('[INFO] Encryption key loaded successfully');
    
    // Initialize database
    await initDatabase();
    console.log('[INFO] Database initialized successfully');
    
    // Create backup directory
    const BACKUP_DIR = path.join(__dirname, '..', 'backups');
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      console.log('[INFO] Backup directory ensured');
    } catch (err) {
      console.log('[INFO] Backup directory already exists');
    }
    
    // Create the main window
    createWindow();
    createMenu();
  } catch (error) {
    console.error('[ERROR] Failed to initialize app:', error);
    dialog.showErrorBox('Initialization Error', `Failed to start Password Vault: ${error.message}`);
    app.quit();
  }
});

// Aggressive memory management based on configuration
process.setMaxListeners(20); // Reduce event listener limit
if (process.platform === 'linux') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

// Force garbage collection based on memory profile
if (memoryConfig.shouldEnableGC() && global.gc) {
  setInterval(() => {
    global.gc();
    console.log(`[GC] Forced garbage collection (${memoryConfig.getMemoryProfile()} profile)`);
  }, memoryConfig.getGCInterval());
}

// Database and encryption setup
// Use user data directory for persistence in packaged app
let BASE_DIR, DB_PATH, KEY_FILE, BACKUP_DIR;

function initializePaths() {
  BASE_DIR = app.getPath('userData');
  DB_PATH = path.join(BASE_DIR, 'passwords.db');
  KEY_FILE = path.join(BASE_DIR, '.secret.key');
  BACKUP_DIR = path.join(BASE_DIR, 'backups');
}

// Encryption functions
function loadOrCreateKey() {
  try {
    let key;
    
    // Ensure the base directory exists
    const fs = require('fs');
    if (!fs.existsSync(BASE_DIR)) {
      fs.mkdirSync(BASE_DIR, { recursive: true });
      console.log('[INFO] Created user data directory');
    }
    
    if (process.env.ENCRYPTION_KEY) {
      key = Buffer.from(process.env.ENCRYPTION_KEY);
    } else {
      try {
        key = fs.readFileSync(KEY_FILE);
      } catch (err) {
        // Generate new key
        key = crypto.randomBytes(32);
        fs.writeFileSync(KEY_FILE, key);
        console.log('[INFO] Generated new encryption key');
      }
    }
    
    // Ensure key is exactly 32 bytes for AES-256
    if (key.length !== 32) {
      if (key.length > 32) {
        key = key.slice(0, 32);
      } else {
        const newKey = Buffer.alloc(32);
        key.copy(newKey);
        key = newKey;
      }
    }
    
    return key;
  } catch (err) {
    console.error('Error with encryption key:', err);
    throw err;
  }
}

function encrypt(text) {
  if (text === null || text === undefined) {
    throw new Error('Cannot encrypt null or undefined value');
  }
  
  const textString = String(text);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(textString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) {
    throw new Error('Cannot decrypt empty or null value');
  }
  
  const textString = String(encryptedText);
  
  // Check for Fernet encryption (from original Flask app)
  if (textString.startsWith('gAAAAAB')) {
    throw new Error('FERNET_ENCRYPTED_PASSWORD');
  }
  
  // Try new format first (with IV)
  if (textString.includes(':')) {
    try {
      const parts = textString.split(':');
      if (parts.length >= 2) {
        const ivHex = parts[0];
        const encryptedHex = parts.slice(1).join(':');
        
        // Validate IV length (should be 32 hex chars for 16 bytes)
        if (ivHex.length === 32) {
          const iv = Buffer.from(ivHex, 'hex');
          const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
          let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        }
      }
    } catch (error) {
      console.log('New format decryption failed, trying legacy method');
    }
  }
  
  // Fall back to old format - but this won't work in Node.js 22+
  throw new Error('UNSUPPORTED_ENCRYPTION_FORMAT');
}


// Database initialization
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Create tables
      const queries = [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          failed_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP,
          settings TEXT DEFAULT '{}'
        )`,
        `CREATE TABLE IF NOT EXISTS passwords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          label TEXT NOT NULL,
          secret BLOB NOT NULL,
          is_file BOOLEAN DEFAULT 0,
          file_name TEXT,
          file_type TEXT,
          file_size INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          category TEXT DEFAULT 'General',
          tags TEXT DEFAULT '',
          notes TEXT DEFAULT '',
          url TEXT DEFAULT '',
          username TEXT DEFAULT '',
          is_favorite BOOLEAN DEFAULT 0,
          password_strength INTEGER DEFAULT 0,
          last_accessed TIMESTAMP,
          access_count INTEGER DEFAULT 0,
          expires_at TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(user_id, label)
        )`,
        `CREATE TABLE IF NOT EXISTS secure_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          content BLOB NOT NULL,
          category TEXT DEFAULT 'General',
          tags TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_favorite BOOLEAN DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )`
      ];
      
      let completed = 0;
      queries.forEach(query => {
        db.run(query, (err) => {
          if (err) {
            reject(err);
            return;
          }
          completed++;
          if (completed === queries.length) {
            resolve();
          }
        });
      });
    });
  });
}

// Create the main application window
function createWindow() {
  // Use memory configuration for optimized window settings
  const memoryWebPrefs = memoryConfig.getBrowserWindowConfig().webPreferences;
  const preloadPath = path.join(__dirname, 'preload.js');
  
  // Get memory config but override webPreferences to ensure preload works
  const memoryWindowConfig = memoryConfig.getBrowserWindowConfig();
  
  const windowConfig = {
    icon: path.join(__dirname, 'assets', 'icon.png'),
    ...memoryWindowConfig,
    webPreferences: {
      // Essential settings for preload to work (THESE MUST COME LAST)
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: preloadPath,
      webSecurity: false,
      // Memory optimizations that don't break preload
      spellcheck: false,
      backgroundThrottling: false,
      offscreen: false,
      v8CacheOptions: 'none',
      experimentalFeatures: false,
      plugins: false,
      webgl: false,
      nodeIntegrationInSubFrames: false,
      sandbox: false
    },
    titleBarStyle: 'default'
  };
  
  mainWindow = new BrowserWindow(windowConfig);

  // Optimize webContents for memory usage based on profile
  mainWindow.webContents.on('dom-ready', () => {
    const profile = memoryConfig.getMemoryProfile();
    const disableAnimations = memoryConfig.shouldDisableAnimations();
    const disableEffects = memoryConfig.shouldDisableEffects();
    const cleanupInterval = memoryConfig.getCleanupInterval();
    
    mainWindow.webContents.executeJavaScript(`
      // Apply memory profile optimizations
      console.log('Applying memory optimizations for profile: ${profile}');
      
      // Disable smooth scrolling for performance
      document.documentElement.style.scrollBehavior = 'auto';
      
      // Apply animation and effect optimizations
      const style = document.createElement('style');
      style.textContent = \`
        *, *::before, *::after {
          animation-duration: ${disableAnimations ? '0.01s' : '0.1s'} !important;
          animation-delay: 0s !important;
          transition-duration: ${disableAnimations ? '0.01s' : '0.1s'} !important;
          transition-delay: 0s !important;
          ${disableEffects ? 'box-shadow: none !important; backdrop-filter: none !important;' : ''}
        }
      \`;
      document.head.appendChild(style);
      
      // Memory cleanup function
      window.memoryCleanup = function() {
        if (window.gc) window.gc();
        const event = new CustomEvent('memory-cleanup');
        document.dispatchEvent(event);
        console.log('Memory cleanup executed');
      };
      
      // Set memory profile for renderer
      window.memoryProfile = '${profile}';
      window.targetMemoryMB = ${memoryConfig.getTargetMemoryMB()};
      
      // Run cleanup at configured interval
      setInterval(window.memoryCleanup, ${cleanupInterval});
    `);
  });

  // Load the login page initially
  mainWindow.loadFile(path.join(__dirname, 'pages', 'login.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.platform === 'darwin') {
      app.dock.show();
    }
    mainWindow.focus();
    
    // Force initial garbage collection
    if (global.gc) {
      setTimeout(() => global.gc(), 5000);
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    // Cleanup before closing
    if (db) {
      db.close();
      db = null;
    }
    mainWindow = null;
    // Force garbage collection
    if (global.gc) global.gc();
  });

  // Handle navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent new windows from opening (memory optimization)
  mainWindow.webContents.on('new-window', (event) => {
    event.preventDefault();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Password',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (currentUser) {
              mainWindow.webContents.send('navigate-to', 'add-password');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Logout',
          click: () => {
            currentUser = null;
            mainWindow.loadFile(path.join(__dirname, 'pages', 'login.html'));
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Home',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (currentUser) {
              mainWindow.webContents.send('navigate-to', 'dashboard');
            }
          }
        },
        {
          label: 'Password Generator',
          accelerator: 'CmdOrCtrl+G',
          click: () => {
            if (currentUser) {
              mainWindow.webContents.send('navigate-to', 'generator');
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Password Vault',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Password Vault',
              message: 'Password Vault Desktop v1.0',
              detail: 'A secure password manager built with Electron'
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC handlers for authentication
ipcMain.handle('register-user', async (event, userData) => {
  try {
    const { username, email, password } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve) => {
      db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              resolve({ success: false, error: 'Username or email already exists' });
            } else {
              resolve({ success: false, error: err.message });
            }
          } else {
            resolve({ success: true, userId: this.lastID });
          }
        }
      );
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('login-user', async (event, loginData) => {
  try {
    const { username, password } = loginData;
    
    return new Promise((resolve) => {
      db.get(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, username],
        async (err, user) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }
          
          if (!user) {
            resolve({ success: false, error: 'Invalid username or password' });
            return;
          }
          
          try {
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (isValid) {
              currentUser = user;
              
              resolve({ success: true, user: { id: user.id, username: user.username, email: user.email } });
            } else {
              resolve({ success: false, error: 'Invalid username or password' });
            }
          } catch (bcryptError) {
            resolve({ success: false, error: 'Authentication error' });
          }
        }
      );
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('logout-user', async (event) => {
  currentUser = null;
  return { success: true };
});

// Check authentication status
ipcMain.handle('check-auth', async (event) => {
  if (currentUser) {
    return { 
      success: true, 
      authenticated: true, 
      user: { 
        id: currentUser.id, 
        username: currentUser.username, 
        email: currentUser.email 
      } 
    };
  } else {
    return { 
      success: true, 
      authenticated: false 
    };
  }
});

// Password management
ipcMain.handle('get-passwords', async (event, searchTerm = '') => {
  console.log('get-passwords called, currentUser:', currentUser ? currentUser.username : 'null');
  
  if (!currentUser) {
    console.log('No current user, returning authentication error');
    return { success: false, error: 'Not authenticated' };
  }
  
  return new Promise((resolve) => {
    let query = 'SELECT * FROM passwords WHERE user_id = ? ORDER BY created_at DESC';
    let params = [currentUser.id];
    
    if (searchTerm && searchTerm.trim()) {
      query = 'SELECT * FROM passwords WHERE user_id = ? AND (label LIKE ? OR username LIKE ? OR category LIKE ?) ORDER BY created_at DESC';
      const search = `%${searchTerm.trim()}%`;
      params = [currentUser.id, search, search, search];
    }
    
    console.log('Executing query:', query, 'with params:', params);
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Database error in get-passwords:', err);
        resolve({ success: false, error: err.message });
        return;
      }
      
      console.log('Found', rows.length, 'passwords for user');
      
      try {
        const passwords = rows.map(p => {
          try {
            const decryptedSecret = decrypt(p.secret.toString());
            
            // Check if this password needs migration to new encryption format
            const secretString = p.secret.toString();
            const needsMigration = !secretString.includes(':') || 
                                 (secretString.includes(':') && secretString.split(':')[0].length !== 32);
            
            if (needsMigration) {
              console.log('Migrating password encryption for ID:', p.id);
              // Re-encrypt with new format and update in database
              const newEncryptedSecret = encrypt(decryptedSecret);
              db.run(
                'UPDATE passwords SET secret = ? WHERE id = ?',
                [newEncryptedSecret, p.id],
                (err) => {
                  if (err) {
                    console.error('Error migrating password encryption:', err);
                  } else {
                    console.log('Successfully migrated password encryption for ID:', p.id);
                  }
                }
              );
            }
            
            return {
              ...p,
              secret: decryptedSecret
            };
          } catch (decryptError) {
            console.error('Error decrypting password:', decryptError.message);
            
            // Handle specific error types
            if (decryptError.message === 'FERNET_ENCRYPTED_PASSWORD') {
              return {
                ...p,
                secret: '[FERNET_ENCRYPTED - Please re-enter this password]',
                needsReentry: true
              };
            } else if (decryptError.message === 'UNSUPPORTED_ENCRYPTION_FORMAT') {
              return {
                ...p,
                secret: '[UNSUPPORTED_FORMAT - Please re-enter this password]',
                needsReentry: true
              };
            } else {
              return {
                ...p,
                secret: '[DECRYPTION_ERROR - Please re-enter this password]',
                needsReentry: true
              };
            }
          }
        });
        resolve({ success: true, passwords });
      } catch (error) {
        console.error('Error processing passwords:', error);
        resolve({ success: false, error: 'Failed to decrypt passwords: ' + error.message });
      }
    });
  });
});

ipcMain.handle('add-password', async (event, passwordData) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  try {
    const { label, username, password, url, category, notes, tags } = passwordData;
    
    // Validate required fields
    if (!label || !password) {
      return { success: false, error: 'Label and password are required' };
    }
    
    const encryptedPassword = encrypt(password);
    
    return new Promise((resolve) => {
      db.run(
        `INSERT INTO passwords (user_id, label, username, secret, url, category, notes, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [currentUser.id, label, username || '', encryptedPassword, url || '', category || 'General', notes || '', tags || ''],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              resolve({ success: false, error: 'A password with this label already exists' });
            } else {
              resolve({ success: false, error: err.message });
            }
          } else {
            resolve({ success: true, id: this.lastID });
          }
        }
      );
    });
  } catch (error) {
    console.error('Add password error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-password', async (event, passwordData) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  try {
    const { id, label, username, password, url, category, notes, tags } = passwordData;
    
    // Validate required fields
    if (!id) {
      return { success: false, error: 'Password ID is required' };
    }
    if (!label || !password) {
      return { success: false, error: 'Label and password are required' };
    }
    
    const encryptedPassword = encrypt(password);
    
    return new Promise((resolve) => {
      db.run(
        `UPDATE passwords SET label = ?, username = ?, secret = ?, url = ?, category = ?, notes = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [label, username || '', encryptedPassword, url || '', category || 'General', notes || '', tags || '', id, currentUser.id],
        function(err) {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            if (this.changes === 0) {
              resolve({ success: false, error: 'Password not found or access denied' });
            } else {
              resolve({ success: true });
            }
          }
        }
      );
    });
  } catch (error) {
    console.error('Update password error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-password', async (event, passwordId) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  return new Promise((resolve) => {
    db.run(
      'DELETE FROM passwords WHERE id = ? AND user_id = ?',
      [passwordId, currentUser.id],
      function(err) {
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

// Copy password to clipboard
ipcMain.handle('copy-password', async (event, passwordId) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  return new Promise((resolve) => {
    db.get(
      'SELECT secret FROM passwords WHERE id = ? AND user_id = ?',
      [passwordId, currentUser.id],
      (err, row) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }
        
        if (!row) {
          resolve({ success: false, error: 'Password not found' });
          return;
        }
        
        try {
          const decryptedPassword = decrypt(row.secret.toString());
          clipboard.writeText(decryptedPassword);
          
          // Clear clipboard after 30 seconds
          setTimeout(() => {
            clipboard.clear();
          }, 30000);
          
          resolve({ success: true });
        } catch (error) {
          resolve({ success: false, error: 'Failed to decrypt password' });
        }
      }
    );
  });
});

// Navigation
ipcMain.handle('navigate-to-dashboard', async (event) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  try {
    await mainWindow.loadFile(path.join(__dirname, 'pages', 'dashboard.html'));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Generate password
ipcMain.handle('generate-password', async (event, options = {}) => {
  const {
    length = 12,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = false,
    excludeSimilar = false
  } = options;
  
  let charset = '';
  if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeNumbers) charset += '0123456789';
  if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (excludeSimilar) {
    charset = charset.replace(/[il1Lo0O]/g, '');
  }
  
  if (!charset) {
    return { success: false, error: 'At least one character type must be selected' };
  }
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return { success: true, password };
});

// Show notification
ipcMain.handle('show-notification', async (event, message) => {
  try {
    if (Notification.isSupported()) {
      new Notification({
        title: 'Password Vault',
        body: message,
        silent: true
      }).show();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Export passwords
ipcMain.handle('export-passwords', async (event, exportOptions) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  const fs = require('fs');
  const path = require('path');
  const { dialog } = require('electron');
  
  try {
    // Get all passwords
    const passwords = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM passwords WHERE user_id = ? ORDER BY created_at DESC', [currentUser.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Decrypt passwords
    let decryptedPasswords = [];
    for (const p of passwords) {
      try {
        decryptedPasswords.push({
          ...p,
          secret: decrypt(p.secret.toString())
        });
      } catch (error) {
        console.error('Error decrypting password:', error);
      }
    }
    
    let exportData, filename, defaultPath;
    
    if (exportOptions.format === 'csv') {
      const csvHeader = 'Label,Username,Password,URL,Category,Notes,Tags,Created\n';
      const csvRows = decryptedPasswords.map(p => {
        const fields = [
          p.label || '',
          p.username || '',
          p.secret || '',
          p.url || '',
          p.category || '',
          p.notes || '',
          p.tags || '',
          p.created_at || new Date().toISOString()
        ];
        return fields.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      });
      
      exportData = csvHeader + csvRows.join('\n');
      filename = `password_vault_export_${new Date().toISOString().split('T')[0]}.csv`;
      defaultPath = path.join(require('os').homedir(), 'Downloads', filename);
    } else if (exportOptions.format === 'json') {
      // JSON format
      const backupData = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        passwords: decryptedPasswords,
        user: { username: currentUser.username }
      };
      
      exportData = JSON.stringify(backupData, null, 2);
      filename = `password_vault_export_${new Date().toISOString().split('T')[0]}.json`;
      defaultPath = path.join(require('os').homedir(), 'Downloads', filename);
    } else {
      // Encrypted backup
      const backupData = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        passwords: decryptedPasswords,
        user: { username: currentUser.username }
      };
      
      exportData = encrypt(JSON.stringify(backupData));
      filename = `password_vault_backup_${new Date().toISOString().split('T')[0]}.vault`;
      defaultPath = path.join(require('os').homedir(), 'Downloads', filename);
    }
    
    // Show save dialog
    let fileExtension = exportOptions.format;
    if (exportOptions.format === 'encrypted') {
      fileExtension = 'vault';
    }
    
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Passwords',
      defaultPath: defaultPath,
      filters: [
        { name: 'Export Files', extensions: [fileExtension] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['createDirectory']
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export canceled' };
    }
    
    try {
      fs.writeFileSync(result.filePath, exportData, 'utf8');
      
      return { 
        success: true, 
        filename: path.basename(result.filePath),
        path: result.filePath,
        count: decryptedPasswords.length 
      };
    } catch (writeError) {
      console.error('Failed to write export file:', writeError);
      return { success: false, error: `Failed to save file: ${writeError.message}` };
    }
    
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
});

// Backup and restore
ipcMain.handle('create-backup', async (event) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  const fs = require('fs');
  const path = require('path');
  const { dialog } = require('electron');
  
  try {
    // Get all user data
    const passwords = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM passwords WHERE user_id = ? ORDER BY created_at DESC', [currentUser.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Decrypt passwords for backup safely
    let decryptedPasswords = [];
    for (const p of passwords) {
      try {
        if (!p || typeof p !== 'object') {
          console.warn('Invalid password object for backup:', p);
          continue;
        }
        
        let decryptedPassword = { ...p };
        
        if (!p.secret || p.secret === null || p.secret === undefined) {
          console.warn('Password with null/undefined secret for backup:', p.id);
          decryptedPassword.secret = '';
        } else {
          try {
            decryptedPassword.secret = decrypt(p.secret.toString());
          } catch (decryptError) {
            console.error('Error decrypting password for backup:', decryptError);
            decryptedPassword.secret = '[DECRYPTION_ERROR]';
          }
        }
        
        decryptedPasswords.push(decryptedPassword);
      } catch (error) {
        console.error('Error processing password for backup:', error);
        // Continue with next password instead of failing
      }
    }
    
    const backupData = {
      created_at: new Date().toISOString(),
      version: '1.0',
      user: { username: currentUser.username },
      passwords: decryptedPasswords
    };
    
    const filename = `password_vault_backup_${new Date().toISOString().split('T')[0]}.vault`;
    const defaultPath = path.join(require('os').homedir(), 'Downloads', filename);
    
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Create Backup',
      defaultPath: defaultPath,
      filters: [
        { name: 'Vault Backup Files', extensions: ['vault'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['createDirectory']
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Backup canceled' };
    }
    
    // Encrypt backup
    try {
      const encryptedData = encrypt(JSON.stringify(backupData));
      fs.writeFileSync(result.filePath, encryptedData, 'utf8');
      
      return { 
        success: true, 
        filename: path.basename(result.filePath),
        path: result.filePath 
      };
    } catch (writeError) {
      console.error('Failed to write backup file:', writeError);
      return { success: false, error: `Failed to save backup: ${writeError.message}` };
    }
    
  } catch (error) {
    console.error('Backup error:', error);
    return { success: false, error: error.message };
  }
});

// Import passwords from external sources
ipcMain.handle('import-passwords', async (event, importData) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  try {
    if (!Array.isArray(importData) || importData.length === 0) {
      return { success: false, error: 'No valid password data provided' };
    }
    
    let importedCount = 0;
    const errors = [];
    
    for (const passwordData of importData) {
      try {
        // Validate required fields
        if (!passwordData.label || !passwordData.password) {
          errors.push(`Skipped entry: Missing label or password`);
          continue;
        }
        
        // Encrypt the password
        const encryptedPassword = encrypt(passwordData.password);
        
        // Insert into database
        const result = await new Promise((resolve) => {
          db.run(
            `INSERT INTO passwords (user_id, label, username, secret, url, category, notes, tags, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              currentUser.id,
              passwordData.label.substring(0, 255),
              passwordData.username ? passwordData.username.substring(0, 255) : null,
              encryptedPassword,
              passwordData.url ? passwordData.url.substring(0, 500) : null,
              passwordData.category || 'Imported',
              passwordData.notes ? passwordData.notes.substring(0, 1000) : null,
              passwordData.tags || null
            ],
            function(err) {
              if (err) {
                resolve({ success: false, error: err.message });
              } else {
                resolve({ success: true });
              }
            }
          );
        });
        
        if (result.success) {
          importedCount++;
        } else {
          errors.push(`Error importing "${passwordData.label}": ${result.error}`);
        }
        
      } catch (error) {
        errors.push(`Error importing "${passwordData.label}": ${error.message}`);
      }
    }
    
    return { 
      success: true, 
      count: importedCount,
      errors: errors.length > 0 ? errors : null
    };
    
  } catch (error) {
    console.error('Import error:', error);
    return { success: false, error: error.message };
  }
});

// Secure Notes IPC handlers
ipcMain.handle('get-secure-notes', async (event) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  try {
    const notes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM secure_notes WHERE user_id = ? ORDER BY updated_at DESC', [currentUser.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Decrypt note content
    const decryptedNotes = notes.map(note => {
      try {
        return {
          ...note,
          content: decrypt(note.content)
        };
      } catch (error) {
        console.error('Error decrypting note:', error);
        return {
          ...note,
          content: '[DECRYPTION_ERROR]'
        };
      }
    });
    
    return { success: true, notes: decryptedNotes };
  } catch (error) {
    console.error('Error getting secure notes:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-secure-note', async (event, noteData) => {
  console.log('add-secure-note called with data:', noteData);
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  try {
    const { title, content, category = 'General', tags = '', is_favorite = false } = noteData;
    
    if (!title || !content) {
      return { success: false, error: 'Title and content are required' };
    }
    
    // Encrypt content
    const encryptedContent = encrypt(content);
    
    const result = await new Promise((resolve) => {
      db.run(
        `INSERT INTO secure_notes (user_id, title, content, category, tags, is_favorite, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [currentUser.id, title, encryptedContent, category, tags, is_favorite ? 1 : 0],
        function(err) {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, id: this.lastID });
          }
        }
      );
    });
    
    return result;
  } catch (error) {
    console.error('Error adding secure note:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-secure-note', async (event, { id, ...noteData }) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  try {
    const { title, content, category, tags, is_favorite = false } = noteData;
    
    if (!title || !content) {
      return { success: false, error: 'Title and content are required' };
    }
    
    // Encrypt content
    const encryptedContent = encrypt(content);
    
    const result = await new Promise((resolve) => {
      db.run(
        `UPDATE secure_notes SET title = ?, content = ?, category = ?, tags = ?, is_favorite = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [title, encryptedContent, category, tags, is_favorite ? 1 : 0, id, currentUser.id],
        function(err) {
          if (err) {
            resolve({ success: false, error: err.message });
          } else if (this.changes === 0) {
            resolve({ success: false, error: 'Note not found' });
          } else {
            resolve({ success: true });
          }
        }
      );
    });
    
    return result;
  } catch (error) {
    console.error('Error updating secure note:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-secure-note', async (event, id) => {
  if (!currentUser) return { success: false, error: 'Not authenticated' };
  
  try {
    const result = await new Promise((resolve) => {
      db.run('DELETE FROM secure_notes WHERE id = ? AND user_id = ?', [id, currentUser.id], function(err) {
        if (err) {
          resolve({ success: false, error: err.message });
        } else if (this.changes === 0) {
          resolve({ success: false, error: 'Note not found' });
        } else {
          resolve({ success: true });
        }
      });
    });
    
    return result;
  } catch (error) {
    console.error('Error deleting secure note:', error);
    return { success: false, error: error.message };
  }
});

// App event handlers (main initialization is handled above)

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle app protocol for better security
app.setAsDefaultProtocolClient('password-vault'); 