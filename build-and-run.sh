#!/bin/bash

# Password Vault - Automated Build and Run Script
# This script automatically builds binaries if they don't exist and launches the app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 Password Vault - Automated Build & Run Script"
echo "================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    echo "Ubuntu/Debian: sudo apt update && sudo apt install -y nodejs npm"
    echo "Fedora/RHEL: sudo dnf install -y nodejs npm"
    echo "macOS: brew install node" 
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Detect platform
PLATFORM=$(uname)
print_status "Detected platform: $PLATFORM"

# Define binary paths based on platform
case $PLATFORM in
    "Linux")
        APPIMAGE_PATH="dist/Password Vault-1.0.0.AppImage"
        TARBALL_PATH="dist/password-vault-desktop-1.0.0.tar.gz"
        BUILD_CMD="npm run build-linux"
        RUN_CMD="./${APPIMAGE_PATH}"
        BINARY_NAME="AppImage"
        ;;
    "Darwin")
        BINARY_PATH="dist/Password Vault-1.0.0.dmg"
        BUILD_CMD="npm run build-mac"
        RUN_CMD="open '${BINARY_PATH}'"
        BINARY_NAME="DMG"
        ;;
    "MINGW"*|"MSYS"*|"CYGWIN"*)
        BINARY_PATH="dist/Password Vault Setup 1.0.0.exe"
        BUILD_CMD="npm run build-win"
        RUN_CMD="./${BINARY_PATH}"
        BINARY_NAME="installer"
        ;;
    *)
        print_warning "Unknown platform: $PLATFORM, will build for current platform"
        BUILD_CMD="npm run build"
        ;;
esac

# Check if binaries exist
BINARIES_EXIST=false

if [[ "$PLATFORM" == "Linux" ]]; then
    if [[ -f "$APPIMAGE_PATH" ]]; then
        print_success "AppImage binary found: $APPIMAGE_PATH"
        BINARIES_EXIST=true
    fi
    if [[ -f "$TARBALL_PATH" ]]; then
        print_success "Tarball binary found: $TARBALL_PATH"
        BINARIES_EXIST=true
    fi
else
    if [[ -f "$BINARY_PATH" ]]; then
        print_success "${BINARY_NAME} binary found: $BINARY_PATH"
        BINARIES_EXIST=true
    fi
fi

# Check if dependencies are installed
if [[ ! -d "node_modules" ]]; then
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed!"
else
    print_status "Dependencies already installed"
fi

# Build binaries if they don't exist
if [[ "$BINARIES_EXIST" == false ]]; then
    print_warning "No binaries found, building now..."
    
    print_status "Starting build process..."
    print_status "This may take a few minutes..."
    
    # Run the build command
    eval $BUILD_CMD
    
    if [[ $? -eq 0 ]]; then
        print_success "Build completed successfully!"
        
        # List generated files
        echo ""
        print_status "Generated files:"
        ls -la dist/ 2>/dev/null || echo "No dist directory found"
        
        # Calculate sizes
        if [[ "$PLATFORM" == "Linux" ]]; then
            if [[ -f "$APPIMAGE_PATH" ]]; then
                SIZE=$(du -h "$APPIMAGE_PATH" | cut -f1)
                print_success "✓ AppImage: $APPIMAGE_PATH ($SIZE)"
            fi
            if [[ -f "$TARBALL_PATH" ]]; then
                SIZE=$(du -h "$TARBALL_PATH" | cut -f1)
                print_success "✓ Tarball: $TARBALL_PATH ($SIZE)"
            fi
        else
            if [[ -f "$BINARY_PATH" ]]; then
                SIZE=$(du -h "$BINARY_PATH" | cut -f1)
                print_success "✓ ${BINARY_NAME}: $BINARY_PATH ($SIZE)"
            fi
        fi
    else
        print_error "Build failed! Check the output above for errors."
        echo ""
        print_status "Common solutions:"
        echo "  1. Check Node.js version (needs 16+): node --version"
        echo "  2. Install build tools: sudo apt install build-essential python3-dev"
        echo "  3. Clear cache: rm -rf node_modules package-lock.json && npm install"
        echo "  4. Try: npm rebuild"
        exit 1
    fi
else
    print_success "Binaries already exist, skipping build"
fi

# Ask user what to do next
echo ""
echo "🎯 What would you like to do?"
echo "1. Run the desktop application (recommended)"
echo "2. Run from source (development mode)"
echo "3. Just exit (I'll run it myself later)"
echo "4. Show application info"

read -p "Enter your choice (1-4) [1]: " -n 1 -r CHOICE
echo

case $CHOICE in
    1|"")
        print_status "Launching desktop application..."
        
        if [[ "$PLATFORM" == "Linux" ]]; then
            if [[ -f "$APPIMAGE_PATH" ]]; then
                chmod +x "$APPIMAGE_PATH"
                print_status "Starting AppImage: $APPIMAGE_PATH"
                eval "$RUN_CMD" &
                print_success "Application launched!"
                print_status "The app is now running in the background."
                print_status "Your password data will be stored in: ~/.config/password-vault-desktop/"
            else
                print_error "AppImage not found. Try running the build again."
                exit 1
            fi
        else
            if [[ -f "$BINARY_PATH" ]]; then
                print_status "Starting ${BINARY_NAME}: $BINARY_PATH"
                eval "$RUN_CMD" &
                print_success "Application launched!"
            else
                print_error "${BINARY_NAME} not found. Try running the build again."
                exit 1
            fi
        fi
        ;;
    2)
        print_status "Launching from source (development mode)..."
        npm start &
        print_success "Development application launched!"
        print_status "The app is running with hot reload enabled."
        ;;
    3)
        print_success "Build complete! You can run the app later using:"
        if [[ "$PLATFORM" == "Linux" ]]; then
            echo "  ./${APPIMAGE_PATH}"
        else
            echo "  ${RUN_CMD}"
        fi
        ;;
    4)
        echo ""
        print_status "Application Information:"
        echo "  Name: Password Vault Desktop"
        echo "  Version: 1.0.0"
        echo "  Platform: $PLATFORM"
        echo "  Data Storage:"
        if [[ "$PLATFORM" == "Linux" ]]; then
            echo "    ~/.config/password-vault-desktop/"
        elif [[ "$PLATFORM" == "Darwin" ]]; then
            echo "    ~/Library/Application Support/password-vault-desktop/"
        else
            echo "    %APPDATA%\\password-vault-desktop\\"
        fi
        echo ""
        print_status "Security Features:"
        echo "  • AES-256-CBC encryption"
        echo "  • SQLite database"
        echo "  • Bcrypt password hashing"
        echo "  • Local storage only (no cloud)"
        echo "  • Memory optimization"
        echo ""
        print_status "Available binaries:"
        ls -la dist/ 2>/dev/null | grep -E "\.(AppImage|dmg|exe|tar\.gz|deb|rpm)$" || echo "  No binaries found"
        ;;
    *)
        print_warning "Invalid choice. Exiting."
        ;;
esac

# Show some helpful tips
echo ""
print_status "💡 Pro Tips:"
echo "  • Use Ctrl+N to create new passwords"
echo "  • Use Ctrl+F to search your passwords"
echo "  • Enable automatic backups in settings"
echo "  • Your master password cannot be recovered - keep it safe!"
echo ""
print_status "🔧 Troubleshooting:"
echo "  • If app won't start: rm -rf ~/.config/password-vault-desktop/Cache/"
echo "  • For memory issues: npm run start-lowmem"
echo "  • For build issues: npm rebuild"
echo "  • Check README.md for complete troubleshooting guide"

echo ""
print_success "🎉 Password Vault setup complete!"
print_status "Enjoy your secure password management! 🔐" 