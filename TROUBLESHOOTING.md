# Password Vault Desktop - Troubleshooting Guide 🔧

Comprehensive troubleshooting guide for Password Vault Desktop with solutions to common issues.

## 🚨 Critical Issues (Fixed)

### ❌ "Initialization Error: ENOENT, .secret.key not found"

**Status:** ✅ **RESOLVED** in current version

**What it was:** The application was trying to read/write the encryption key file in the app directory, which is read-only in packaged Electron applications.

**Root cause:** Using `__dirname` for file paths in packaged apps doesn't work because files are bundled into `app.asar`.

**How we fixed it:**
```javascript
// Old (broken) code:
const BASE_DIR = __dirname.replace('/electron', '');
const KEY_FILE = path.join(BASE_DIR, '.secret.key');

// New (working) code:
const BASE_DIR = app.getPath('userData');
const KEY_FILE = path.join(BASE_DIR, '.secret.key');
```

**If you still see this error:**
1. Make sure you're using the latest version
2. Clear old data: `rm -rf ~/.config/password-vault-desktop/`
3. Restart the app - it will create new files in the correct location

---

## 🔧 Build Issues

### 1. "Could not locate the bindings file" (sqlite3)

**Problem:** Native sqlite3 bindings not compiled for your system or Node.js version.

**Common scenarios:**
- After updating Node.js
- First installation on new system
- After electron-builder packaging

**Solutions:**

#### Quick Fix
```bash
# Rebuild native dependencies
npm rebuild

# Force specific sqlite3 version
npm uninstall sqlite3
npm install sqlite3@5.1.6

# Rebuild for Electron
./node_modules/.bin/electron-rebuild
```

#### Full Reset
```bash
# Complete reinstall
rm -rf node_modules package-lock.json
npm install
npm rebuild
```

#### Platform-specific Issues

**Linux:**
```bash
# Install build tools
sudo apt install build-essential python3-dev

# Missing libraries
sudo apt install libnss3-dev libatk-bridge2.0-dev libdrm2-dev libxcomposite-dev libxdamage-dev libxrandr-dev libgbm-dev libxss-dev libasound2-dev
```

**Windows:**
```cmd
# Install Visual Studio Build Tools
npm install --global windows-build-tools

# Or install Visual Studio Community with C++ workload
```

**macOS:**
```bash
# Install Xcode command line tools
xcode-select --install
```

### 2. "Please specify author 'email'" (DEB package build)

**Problem:** electron-builder requires maintainer email for .deb packages.

**Why it happens:** DEB packages need a maintainer field for compliance.

**Solutions:**

#### Option 1: Add author email
```json
// In package.json
"author": "Your Name <your.email@example.com>"
```

#### Option 2: Skip DEB package
```bash
# Build only AppImage and tar.gz
npm run build-linux -- --config.linux.target=AppImage,tar.gz
```

#### Option 3: Configure in package.json
```json
"build": {
  "linux": {
    "maintainer": "your.email@example.com"
  }
}
```

**Note:** AppImage and tar.gz still build successfully even with this error.

### 3. Build fails with memory errors

**Problem:** Insufficient memory during build process.

**Solutions:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Or use swap space (Linux)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 4. Cross-platform build failures

**Problem:** Trying to build for other platforms without proper setup.

**Expected behavior:** You can only build for your current platform without special configuration.

**Solutions:**
```bash
# Build for current platform only
npm run build

# Platform-specific builds
npm run build-linux    # Only on Linux
npm run build-win      # Only on Windows  
npm run build-mac      # Only on macOS
```

---

## 🚀 Runtime Issues

### 1. Application won't start

**Symptoms:**
- App closes immediately
- Black screen
- No window appears

**Diagnostic steps:**
```bash
# Check if already running
ps aux | grep password-vault
# Kill if found:
pkill -f password-vault-desktop

# Clear cache
rm -rf ~/.config/password-vault-desktop/Cache/
rm -rf ~/.config/password-vault-desktop/GPUCache/

# Try with debug output
DEBUG=* npm start
```

**Common causes and solutions:**

#### GPU/Graphics issues
```bash
# Disable GPU acceleration
npm start -- --disable-gpu --disable-software-rasterizer

# Use software rendering
npm start -- --disable-gpu
```

#### Memory issues
```bash
# Use low memory mode
npm run start-lowmem

# Use ultra-low memory mode (Raspberry Pi)
npm run start-pi
```

#### Permission issues (Linux)
```bash
# Check permissions
ls -la ~/.config/password-vault-desktop/

# Fix permissions
chmod -R 755 ~/.config/password-vault-desktop/
```

### 2. "Out of memory" errors

**Problem:** Application consuming too much RAM.

**Memory usage by mode:**
- Standard: ~900MB (8GB+ systems)
- Low memory: ~500MB (4GB systems)
- Ultra-low: ~200MB (Raspberry Pi)

**Solutions:**

#### Use appropriate memory mode
```bash
# For systems with 4GB or less
npm run start-lowmem

# For Raspberry Pi or <2GB systems
npm run start-pi

# Custom memory limit
npm start -- --max-old-space-size=512
```

#### Monitor memory usage
```bash
# Check current usage
ps aux | grep password-vault | awk '{print $4 " " $6 " " $11}'

# Use system monitor
htop
# Look for "password-vault-desktop" processes
```

#### Optimize system
```bash
# Close other applications
# Clear browser cache
# Restart system if needed

# Check available memory
free -h
```

### 3. Database issues

#### Database corruption
**Symptoms:**
- Can't load passwords
- App crashes when accessing data
- Error messages about database

**Solutions:**
```bash
# Backup current database
cp ~/.config/password-vault-desktop/passwords.db ~/passwords.db.backup

# Try SQLite recovery
sqlite3 ~/.config/password-vault-desktop/passwords.db
sqlite> .recover
sqlite> .output recovered.sql
sqlite> .quit

# Create new database from recovery
sqlite3 new_passwords.db < recovered.sql

# Replace original (backup first!)
cp ~/.config/password-vault-desktop/passwords.db ~/.config/password-vault-desktop/passwords.db.old
cp new_passwords.db ~/.config/password-vault-desktop/passwords.db
```

#### Database locked
**Symptoms:**
- "Database is locked" errors
- Can't save new passwords

**Solutions:**
```bash
# Kill all instances
pkill -f password-vault-desktop

# Remove lock files
rm -f ~/.config/password-vault-desktop/passwords.db-shm
rm -f ~/.config/password-vault-desktop/passwords.db-wal

# Restart application
npm start
```

### 4. Performance issues

#### Slow startup
**Causes and solutions:**

1. **Large database:** Keep under 10MB for best performance
2. **Mechanical drive:** Consider SSD upgrade
3. **Low memory:** Use low memory mode
4. **Background apps:** Close unnecessary applications

```bash
# Check database size
ls -lh ~/.config/password-vault-desktop/passwords.db

# Use AppImage for fastest startup (no extraction)
./dist/Password\ Vault-1.0.0.AppImage

# Profile startup time
time npm start
```

#### Slow database operations
```bash
# Vacuum database (reclaim space)
sqlite3 ~/.config/password-vault-desktop/passwords.db "VACUUM;"

# Analyze database
sqlite3 ~/.config/password-vault-desktop/passwords.db "ANALYZE;"

# Check database integrity
sqlite3 ~/.config/password-vault-desktop/passwords.db "PRAGMA integrity_check;"
```

---

## 🐧 Linux-Specific Issues

### 1. AppImage won't run

**Problem:** AppImage doesn't start or gives permission errors.

**Solutions:**

#### Basic fixes
```bash
# Make executable
chmod +x "./dist/Password Vault-1.0.0.AppImage"

# Run directly
"./dist/Password Vault-1.0.0.AppImage"
```

#### FUSE issues (older systems)
```bash
# If FUSE not available
"./dist/Password Vault-1.0.0.AppImage" --appimage-extract-and-run

# Install FUSE
sudo apt install fuse        # Ubuntu/Debian
sudo dnf install fuse        # Fedora
sudo pacman -S fuse          # Arch
```

#### Extract and run manually
```bash
# Extract AppImage
"./dist/Password Vault-1.0.0.AppImage" --appimage-extract

# Run extracted version
./squashfs-root/password-vault-desktop
```

### 2. Missing libraries

**Problem:** "error while loading shared libraries"

**Common missing libraries:**
```bash
# Ubuntu/Debian
sudo apt install libgtk-3-0 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0

# Fedora/RHEL
sudo dnf install gtk3 libXScrnSaver libXrandr alsa-lib

# Check what's missing
ldd "./dist/Password Vault-1.0.0.AppImage"
```

### 3. Desktop integration

**Problem:** AppImage doesn't appear in application menu.

**Solutions:**
```bash
# Manual desktop file creation
cat > ~/.local/share/applications/password-vault.desktop << EOF
[Desktop Entry]
Name=Password Vault
Comment=Secure Password Manager
Exec=/path/to/Password Vault-1.0.0.AppImage
Icon=password-vault
Type=Application
Categories=Utility;Security;
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications/
```

---

## 🪟 Windows-Specific Issues

### 1. "Windows protected your PC" message

**Problem:** Windows SmartScreen blocking the application.

**Solution:**
1. Click "More info"
2. Click "Run anyway"
3. Or add to Windows Defender exceptions

### 2. Application won't install

**Problem:** Installer fails or won't start.

**Solutions:**
- Run as Administrator
- Temporarily disable antivirus
- Use portable version instead
- Check Windows version compatibility

### 3. Performance issues on Windows

**Solutions:**
```cmd
# Use Windows-optimized flags
npm start -- --disable-gpu --disable-software-rasterizer --no-sandbox

# Increase priority
start /high npm start
```

---

## 🍎 macOS-Specific Issues

### 1. "App can't be opened" (Gatekeeper)

**Problem:** macOS blocks unsigned applications.

**Solutions:**
1. Right-click app → "Open"
2. Or: System Preferences → Security & Privacy → "Open Anyway"
3. Or disable Gatekeeper: `sudo spctl --master-disable`

### 2. App crashes on startup (macOS)

**Solutions:**
```bash
# Run from terminal to see errors
"/Applications/Password Vault.app/Contents/MacOS/Password Vault"

# Check console logs
Console.app → Search for "Password Vault"

# Try safe mode
"/Applications/Password Vault.app/Contents/MacOS/Password Vault" --safe-mode
```

---

## 🔄 Recovery Procedures

### 1. Complete reset (keeps passwords)

```bash
# Stop application
pkill -f password-vault-desktop

# Keep passwords and encryption key, remove everything else
cd ~/.config/password-vault-desktop/
ls -la  # Make note of what's there
mv passwords.db ../passwords.db.backup
mv .secret.key ../secret.key.backup
rm -rf *
mv ../passwords.db.backup passwords.db
mv ../secret.key.backup .secret.key

# Restart application
npm start
```

### 2. Master password recovery

**Unfortunately, master passwords cannot be recovered due to encryption.**

**Options:**
1. Try to remember password variations
2. Use password hints if you created them
3. Restore from external backup if available
4. Reset everything (loses all data)

**Reset procedure:**
```bash
# DANGER: This deletes all passwords!
rm -rf ~/.config/password-vault-desktop/
# App will create new empty vault on next start
```

### 3. Data recovery from backups

**Automatic backups location:**
```bash
# Check for backups
ls -la ~/.config/password-vault-desktop/backups/

# Restore from backup (through app menu)
# Or manually:
cp ~/.config/password-vault-desktop/backups/backup-YYYYMMDD.vault ~/restore.vault
# Then import through application
```

---

## 🛠️ Development & Advanced Troubleshooting

### 1. Debug mode

```bash
# Start with full debugging
DEBUG=* npm start

# Electron-specific debugging
npm start -- --enable-logging --v=1

# Node.js debugging
node --inspect-brk=9229 electron/main.js
```

### 2. Check application logs

**Linux:**
```bash
# Application logs
~/.config/password-vault-desktop/logs/

# System logs
journalctl -f | grep password-vault
```

**Windows:**
```cmd
# Event Viewer
eventvwr.msc
# Look under Application logs
```

**macOS:**
```bash
# Console app or
log stream --predicate 'process == "Password Vault"'
```

### 3. Manual testing

```bash
# Test individual components
node -e "console.log(require('./memory-config.js'))"

# Test encryption
node -e "
const crypto = require('crypto');
const key = crypto.randomBytes(32);
const text = 'test';
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
let encrypted = cipher.update(text, 'utf8', 'hex');
encrypted += cipher.final('hex');
console.log('Encryption test:', encrypted.length > 0);
"
```

---

## 📞 Getting Help

### Before asking for help:

1. **Check this troubleshooting guide**
2. **Try the automated build script:** `./build-and-run.sh`
3. **Clear cache:** `rm -rf ~/.config/password-vault-desktop/Cache/`
4. **Check system resources:** `free -h` and `df -h`
5. **Try low memory mode:** `npm run start-lowmem`

### When reporting issues:

**Include this information:**
```bash
# System information
uname -a
node --version
npm --version
cat /etc/os-release  # Linux
sw_vers             # macOS

# Application logs
tail -50 ~/.config/password-vault-desktop/logs/main.log

# Error output
npm start 2>&1 | tail -20
```

### Support channels:

1. **GitHub Issues** - For bugs and feature requests
2. **Documentation** - README.md, INSTALLATION.md
3. **Community** - Discussions and help

---

## 🐛 Quick Fixes Checklist

When something goes wrong, try these in order:

1. ☐ **Restart the application**
2. ☐ **Clear cache:** `rm -rf ~/.config/password-vault-desktop/Cache/`
3. ☐ **Try low memory mode:** `npm run start-lowmem`
4. ☐ **Check for running instances:** `ps aux | grep password-vault`
5. ☐ **Rebuild dependencies:** `npm rebuild`
6. ☐ **Check disk space:** `df -h`
7. ☐ **Update Node.js:** `node --version` (need 16+)
8. ☐ **Use automated build script:** `./build-and-run.sh`

---

## 🎯 Prevention Tips

**To avoid issues:**

1. **Keep Node.js updated** (but test in dev first)
2. **Regular backups** (use built-in backup feature)
3. **Monitor disk space** (need 1GB+ free)
4. **Use AppImage on Linux** (most reliable)
5. **Don't modify config files manually**
6. **Close app properly** (don't force-kill)
7. **Use low memory mode on constrained systems**

---

**Remember:** Most issues are fixable! When in doubt, try the automated build script or reset cache files. Your password data is safely encrypted and backed up automatically. 