#!/bin/bash

# Password Vault Electron Desktop Installation Script
echo "🔐 Installing Password Vault Desktop (Port-Free Electron Version)"
echo "=============================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p electron/assets

# Create a simple icon (text format for now)
echo "🎨 Creating application icon..."
cat > electron/assets/icon.png << 'EOF'
# This is a placeholder - you can replace with actual PNG icon
# For now, we'll use a simple icon from the system
EOF

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

# No Python dependencies needed for port-free version
echo "✅ No Python dependencies needed for port-free version"

# Create desktop shortcut (Linux)
if command -v xdg-desktop-menu &> /dev/null; then
    echo "🖥️ Creating desktop shortcut..."
    
    INSTALL_DIR=$(pwd)
    
    cat > password-vault-electron.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Password Vault
Comment=Secure Password Manager
Exec=$INSTALL_DIR/start_electron.sh
Icon=$INSTALL_DIR/electron/assets/icon.png
Path=$INSTALL_DIR
Terminal=false
StartupNotify=true
Categories=Utility;Security;
EOF
    
    chmod +x password-vault-electron.desktop
    
    # Install desktop file
    xdg-desktop-menu install password-vault-electron.desktop
    
    # Copy to desktop if Desktop directory exists
    if [ -d "$HOME/Desktop" ]; then
        cp password-vault-electron.desktop "$HOME/Desktop/"
        chmod +x "$HOME/Desktop/password-vault-electron.desktop"
    fi
fi

# Create launcher script
echo "🚀 Creating launcher script..."
cat > start_electron.sh << 'EOF'
#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")"
echo "Starting Password Vault Desktop..."
npm start
EOF

chmod +x start_electron.sh

# Create uninstall script
echo "🗑️ Creating uninstall script..."
cat > uninstall_electron.sh << 'EOF'
#!/bin/bash
echo "Uninstalling Password Vault Desktop (Electron Version)..."

# Remove desktop files
rm -f password-vault-electron.desktop
rm -f "$HOME/Desktop/password-vault-electron.desktop"

# Remove from applications menu
if command -v xdg-desktop-menu &> /dev/null; then
    xdg-desktop-menu uninstall password-vault-electron.desktop
fi

# Remove Node modules (optional)
read -p "Remove Node.js dependencies? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf node_modules/
    rm -f package-lock.json
fi

echo "Uninstall complete!"
EOF

chmod +x uninstall_electron.sh

echo ""
echo "🎉 Installation Complete!"
echo "========================="
echo ""
echo "To run Password Vault Desktop:"
echo "  ./start_electron.sh"
echo "  or"
echo "  npm start"
echo ""
echo "To uninstall:"
echo "  ./uninstall_electron.sh"
echo ""
echo "Features of this Port-Free Electron version:"
echo "  ✅ NO PORTS USED - True standalone desktop app"
echo "  ✅ NO Flask server - Pure Electron backend"
echo "  ✅ Native desktop application (no browser needed)"
echo "  ✅ Beautiful web app-style UI"
echo "  ✅ Keyboard shortcuts (Ctrl+N, Ctrl+F, etc.)"
echo "  ✅ Desktop notifications"
echo "  ✅ Native menus and window controls"
echo "  ✅ Better clipboard integration"
echo "  ✅ Same database compatibility"
echo ""
echo "Enjoy your new desktop password vault! 🔐" 