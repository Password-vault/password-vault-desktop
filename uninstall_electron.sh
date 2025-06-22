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
