# Password Vault Desktop - Installation Guide 🔐

Complete installation guide for Password Vault Desktop, a secure Electron-based password manager.

## 🚀 Quick Installation (Recommended)

### One-Command Installation
```bash
chmod +x build-and-run.sh
./build-and-run.sh
```

This automated script will:
- ✅ Check system requirements
- ✅ Install dependencies automatically
- ✅ Build binaries if needed
- ✅ Launch the application
- ✅ Provide troubleshooting help

**That's it!** Your password vault will be ready to use.

---

## 📋 System Requirements

### Minimum Requirements
- **Operating System:** Linux (Ubuntu 18.04+), Windows 10+, macOS 10.14+
- **RAM:** 2GB (4GB recommended)
- **Storage:** 500MB free space
- **CPU:** x64 or ARM64 processor
- **Node.js:** Version 16 or higher

### Recommended Requirements
- **RAM:** 4GB or more for optimal performance
- **Storage:** 1GB free space (includes backups)
- **Display:** 1024x768 or higher resolution
- **SSD:** For faster database operations

### Special Configurations
- **Raspberry Pi:** 1GB RAM minimum, automatic ultra-low memory mode
- **Low Memory Systems:** <4GB RAM, automatic memory optimization
- **Enterprise:** Batch deployment scripts available

---

## 🛠️ Manual Installation

### Step 1: Install Prerequisites

#### Ubuntu/Debian
```bash
# Update package lists
sudo apt update

# Install Node.js and npm
sudo apt install -y nodejs npm

# Install build tools (for native dependencies)
sudo apt install -y build-essential python3-dev

# Verify installation
node --version  # Should be 16+
npm --version
```

#### Fedora/RHEL/CentOS
```bash
# Install Node.js and npm
sudo dnf install -y nodejs npm

# Install build tools
sudo dnf groupinstall "Development Tools"
sudo dnf install python3-devel

# Verify installation
node --version
npm --version
```

#### macOS
```bash
# Install using Homebrew (recommended)
brew install node

# Or download from nodejs.org
# https://nodejs.org/en/download/

# Install Xcode command line tools (for native dependencies)
xcode-select --install

# Verify installation
node --version
npm --version
```

#### Windows
1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Run the installer (.msi file)
3. Install Python 3.x from [python.org](https://python.org/) (for native dependencies)
4. Install Visual Studio Build Tools or Visual Studio Community
5. Verify in Command Prompt:
   ```cmd
   node --version
   npm --version
   ```

### Step 2: Download and Setup

```bash
# Clone the repository (if from Git)
git clone <repository-url>
cd password-vault

# Or extract from archive
tar -xzf password-vault-desktop.tar.gz
cd password-vault
```

### Step 3: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# If you encounter native compilation errors:
npm rebuild
```

### Step 4: Build the Application

#### Build for Your Platform
```bash
# Linux
npm run build-linux

# Windows
npm run build-win

# macOS
npm run build-mac
```

#### Build for All Platforms (Advanced)
```bash
# Requires cross-compilation tools
npm run build-all

# Or use the professional build script
./build_release.sh
```

### Step 5: Run the Application

#### Using Pre-built Binaries
```bash
# Linux AppImage (portable)
./dist/Password\ Vault-1.0.0.AppImage

# Windows installer
./dist/Password\ Vault\ Setup\ 1.0.0.exe

# macOS disk image
open "./dist/Password Vault-1.0.0.dmg"
```

#### Running from Source
```bash
# Standard mode
npm start

# Low memory mode
npm run start-lowmem

# Raspberry Pi mode
npm run start-pi
```

---

## 📦 Binary Distributions

After building, you'll find these files in the `dist/` directory:

### Linux Distributions
| File | Size | Description |
|------|------|-------------|
| `Password Vault-1.0.0.AppImage` | ~109MB | Portable application, no installation required |
| `password-vault-desktop-1.0.0.tar.gz` | ~104MB | Archive for manual installation |
| `password-vault-desktop_1.0.0_amd64.deb` | ~109MB | Debian/Ubuntu package (if configured) |

### Windows Distributions
| File | Size | Description |
|------|------|-------------|
| `Password Vault Setup 1.0.0.exe` | ~110MB | Windows installer with start menu integration |
| `Password Vault-1.0.0.exe` | ~109MB | Portable executable |

### macOS Distributions
| File | Size | Description |
|------|------|-------------|
| `Password Vault-1.0.0.dmg` | ~110MB | macOS disk image with drag-and-drop installer |
| `Password Vault-1.0.0.zip` | ~109MB | Zipped application |

---

## 🔧 Configuration

### Memory Optimization

The application automatically detects your system and optimizes memory usage:

#### Automatic Profiles
- **High-end systems** (8GB+ RAM): Full features, ~900MB usage
- **Mid-range systems** (4-8GB RAM): Balanced optimization, ~700MB usage
- **Limited systems** (2-4GB RAM): Memory savings, ~500MB usage
- **Low-memory systems** (<2GB RAM): Aggressive optimization, ~300MB usage
- **Raspberry Pi**: Ultra-low memory mode, ~200MB usage

#### Manual Override
```bash
# Force low memory mode
npm run start-lowmem

# Force Raspberry Pi mode
npm run start-pi

# Custom memory limit
npm start -- --max-old-space-size=512
```

### Data Storage Locations

#### Linux
```
~/.config/password-vault-desktop/
├── passwords.db         # Encrypted password database
├── .secret.key         # 32-byte encryption key
├── backups/            # Automatic backups
├── Cache/              # Application cache
└── Preferences         # Settings and configuration
```

#### Windows
```
%APPDATA%\password-vault-desktop\
├── passwords.db
├── .secret.key
├── backups\
└── ... (cache and settings)
```

#### macOS
```
~/Library/Application Support/password-vault-desktop/
├── passwords.db
├── .secret.key
├── backups/
└── ... (cache and settings)
```

---

## 🐛 Troubleshooting

### Common Installation Issues

#### 1. "Node.js version not supported"
**Problem:** Older Node.js version installed.

**Solution:**
```bash
# Check current version
node --version

# Ubuntu/Debian - Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

#### 2. "npm install fails with permission errors"
**Problem:** npm global permissions issue.

**Solution:**
```bash
# Configure npm to use a different directory for global packages
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile

# Or use sudo (not recommended)
sudo npm install
```

#### 3. "Could not locate the bindings file (sqlite3)"
**Problem:** Native sqlite3 bindings not compiled.

**Solution:**
```bash
# Rebuild native dependencies
npm rebuild

# Or reinstall sqlite3 with compatible version
npm uninstall sqlite3
npm install sqlite3@5.1.6

# Force rebuild for Electron
./node_modules/.bin/electron-rebuild
```

#### 4. "Python not found" (Windows)
**Problem:** Python required for native compilation.

**Solution:**
1. Install Python 3.x from [python.org](https://python.org/)
2. Check "Add Python to PATH" during installation
3. Install Visual Studio Build Tools:
   ```cmd
   npm install --global windows-build-tools
   ```

#### 5. "Build fails with ENOSPC error"
**Problem:** File system watcher limit exceeded (Linux).

**Solution:**
```bash
# Increase file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Runtime Issues

#### 1. "Initialization Error: ENOENT, .secret.key not found"
**Problem:** Fixed in current version, but may occur with old builds.

**Solution:**
```bash
# This issue has been resolved. If you still see it:
# 1. Make sure you're using the latest version
# 2. Clear old data:
rm -rf ~/.config/password-vault-desktop/
# 3. Restart the app - it will create new files
```

#### 2. Application won't start
**Problem:** Various startup issues.

**Solutions:**
```bash
# Clear application cache
rm -rf ~/.config/password-vault-desktop/Cache/
rm -rf ~/.config/password-vault-desktop/GPUCache/

# Try low memory mode
npm run start-lowmem

# Check for running instances
ps aux | grep password-vault
# Kill if found:
pkill -f password-vault-desktop

# Run with debug output
DEBUG=* npm start
```

#### 3. "Out of memory" errors
**Problem:** Insufficient RAM.

**Solutions:**
```bash
# Use low memory mode
npm run start-lowmem

# Use Raspberry Pi mode (most aggressive)
npm run start-pi

# Close other applications to free RAM
# Consider upgrading RAM if possible
```

#### 4. AppImage won't run (Linux)
**Problem:** Missing FUSE or permissions.

**Solutions:**
```bash
# Make executable
chmod +x "./dist/Password Vault-1.0.0.AppImage"

# If FUSE issues:
"./dist/Password Vault-1.0.0.AppImage" --appimage-extract-and-run

# Install FUSE if missing
sudo apt install fuse
```

#### 5. Database corruption
**Problem:** SQLite database corruption.

**Solutions:**
```bash
# Backup current database
cp ~/.config/password-vault-desktop/passwords.db ~/passwords.db.backup

# Try SQLite recovery
sqlite3 ~/.config/password-vault-desktop/passwords.db
sqlite> .recover
sqlite> .quit

# If recovery fails, restore from backup
cp ~/.config/password-vault-desktop/backups/latest.vault ~/
# Import through application
```

### Build Issues

#### 1. "electron-builder fails"
**Problem:** Missing build dependencies.

**Solution:**
```bash
# Install build tools
# Ubuntu/Debian:
sudo apt install build-essential libnss3-dev libatk-bridge2.0-dev libdrm2-dev libxcomposite-dev libxdamage-dev libxrandr-dev libgbm-dev libxss-dev libasound2-dev

# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### 2. "Please specify author 'email'"
**Problem:** DEB package requires maintainer info.

**Solution:**
```bash
# Edit package.json
nano package.json
# Change:
"author": "Your Name <your.email@example.com>"
# Or disable DEB build:
npm run build-linux -- --config.linux.target=AppImage,tar.gz
```

#### 3. Cross-platform build fails
**Problem:** Missing cross-compilation tools.

**Solution:**
```bash
# This is expected - you can only build for other platforms with special setup
# Focus on building for your current platform:
npm run build  # Builds for current platform only
```

### Performance Issues

#### 1. Slow startup
**Solutions:**
- Use AppImage instead of extracted version
- Close other applications to free RAM
- Try low memory mode: `npm run start-lowmem`
- Check disk space and use SSD if possible

#### 2. High memory usage
**Solutions:**
- Monitor memory: `ps aux | grep password-vault`
- Use low memory mode
- Clear cache: `rm -rf ~/.config/password-vault-desktop/Cache/`
- Restart application periodically

#### 3. Database operations slow
**Solutions:**
- Keep database under 10MB for best performance
- Use built-in database maintenance tools
- Clean old backups
- Consider SSD storage

---

## 🔄 Upgrading

### From Previous Versions
1. **Backup your data** (automatic backups available in app)
2. **Stop the old version:** `./stop_electron.sh`
3. **Install new version** using any method above
4. **Data migrates automatically** - your passwords are preserved

### Backup Before Upgrading
```bash
# Manual backup
cp -r ~/.config/password-vault-desktop/ ~/password-vault-backup-$(date +%Y%m%d)

# Or use built-in backup feature in the application
```

---

## 🗑️ Uninstallation

### Complete Removal
```bash
# Stop the application
./stop_electron.sh

# Remove application files
rm -rf node_modules/
rm -rf dist/

# Remove user data (WARNING: This deletes all passwords!)
rm -rf ~/.config/password-vault-desktop/

# Remove desktop entries (if installed)
rm -f ~/.local/share/applications/password-vault.desktop
rm -f ~/Desktop/password-vault.desktop
```

### Keep Data, Remove Application Only
```bash
# Stop and remove application
./stop_electron.sh
rm -rf node_modules/ dist/

# Keep user data in ~/.config/password-vault-desktop/
# You can reinstall later and your passwords will be preserved
```

---

## 🆘 Getting Help

### Documentation
- **README.md** - Main documentation
- **TESTING.md** - Testing procedures
- **RASPBERRY_PI_GUIDE.md** - ARM device setup

### Built-in Help
- Press **F1** in the application for help
- Check **Settings → About** for version info
- Use **Help → Keyboard Shortcuts** for shortcuts

### Support
- Create GitHub issue for bugs
- Check existing issues for solutions
- Use troubleshooting guide above
- Join community discussions

### Emergency Recovery
If you're locked out or have data corruption:
1. **Check backups:** `ls ~/.config/password-vault-desktop/backups/`
2. **Try database recovery:** See troubleshooting section above
3. **Reset application:** Delete config directory (loses all data)
4. **Restore from external backup** if available

---

## 🎯 Pro Installation Tips

### For Developers
- Use `npm run dev` for development with hot reload
- Install in `~/Applications/` for easy access
- Set up IDE debugging with Node.js configuration

### For System Administrators
- Use silent installation scripts for enterprise deployment
- Configure central backup storage
- Set up automated updates using package managers

### For Low-Memory Systems
- Always use `npm run start-lowmem`
- Close unnecessary applications before starting
- Consider upgrading RAM for better experience

### For Security-Conscious Users
- Verify checksums: `sha256sum dist/Password\ Vault-1.0.0.AppImage`
- Install from source rather than pre-built binaries
- Use disk encryption for additional security

---

## 🎉 Installation Complete!

Your Password Vault Desktop is now ready to use. Here's what to do next:

1. **Create your master password** - Make it strong and memorable
2. **Import existing passwords** - Use the import feature if migrating
3. **Set up automatic backups** - Configure in Settings
4. **Learn keyboard shortcuts** - Press F1 for help
5. **Start securing your digital life!** 🔐

**Remember:** Your master password cannot be recovered, so keep it safe!

---

*For additional support, check the troubleshooting section or create a GitHub issue.* 