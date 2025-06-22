#!/bin/bash

# Password Vault - Professional Build Script
# This script builds distributable packages for all platforms

set -e

echo "🚀 Password Vault - Professional Build Script"
echo "=============================================="

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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed!"
else
    print_status "Dependencies already installed"
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist/
mkdir -p dist/

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
print_status "Building Password Vault v$VERSION"

# Build for current platform first
PLATFORM=$(uname)
print_status "Detected platform: $PLATFORM"

case $PLATFORM in
    "Linux")
        print_status "Building for Linux..."
        npm run dist-linux
        print_success "Linux build completed!"
        
        # List generated files
        echo ""
        print_status "Generated Linux packages:"
        ls -la dist/*.AppImage dist/*.deb dist/*.rpm dist/*.tar.gz 2>/dev/null || true
        ;;
    "Darwin")
        print_status "Building for macOS..."
        npm run dist-mac
        print_success "macOS build completed!"
        
        # List generated files
        echo ""
        print_status "Generated macOS packages:"
        ls -la dist/*.dmg dist/*.zip 2>/dev/null || true
        ;;
    "MINGW"*|"MSYS"*|"CYGWIN"*)
        print_status "Building for Windows..."
        npm run dist-win
        print_success "Windows build completed!"
        
        # List generated files
        echo ""
        print_status "Generated Windows packages:"
        ls -la dist/*.exe dist/*.zip 2>/dev/null || true
        ;;
    *)
        print_warning "Unknown platform: $PLATFORM"
        print_status "Building for current platform..."
        npm run dist
        ;;
esac

# Optional: Build for all platforms (requires cross-compilation setup)
echo ""
read -p "Do you want to build for all platforms? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Building for all platforms..."
    print_warning "This requires cross-compilation tools to be installed"
    
    npm run build-all || {
        print_error "Cross-platform build failed. This is normal if you don't have cross-compilation tools."
        print_status "You can still distribute the packages built for your current platform."
    }
fi

# Calculate file sizes and checksums
echo ""
print_status "Calculating checksums..."
cd dist/
for file in *; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        checksum=$(sha256sum "$file" | cut -d' ' -f1)
        echo "📦 $file ($size) - SHA256: $checksum"
    fi
done
cd ..

# Create checksums file
print_status "Creating checksums file..."
cd dist/
sha256sum * > SHA256SUMS 2>/dev/null || true
cd ..

# Final summary
echo ""
echo "🎉 Build Summary"
echo "==============="
print_success "Password Vault v$VERSION build completed!"
print_status "Distribution packages are in the 'dist/' directory"
print_status "Checksums saved to 'dist/SHA256SUMS'"

echo ""
print_status "Next steps:"
echo "  1. Test the packages on target systems"
echo "  2. Upload to GitHub releases or your distribution server"
echo "  3. Update your website/documentation with download links"
echo "  4. Announce the release to your users!"

echo ""
print_status "Distribution packages ready for professional deployment! 🚀" 