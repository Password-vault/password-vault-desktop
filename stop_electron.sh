#!/bin/bash

# Password Vault Desktop Stop Script
# This script stops the running Electron application

cd "$(dirname "$0")"

echo "Stopping Password Vault Desktop..."

# Check if PID file exists
if [ -f .password-vault.pid ]; then
    PID=$(cat .password-vault.pid)
    
    # Check if process is running
    if kill -0 $PID 2>/dev/null; then
        echo "Stopping application (PID: $PID)..."
        kill $PID
        
        # Wait for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if kill -0 $PID 2>/dev/null; then
            echo "Force stopping application..."
            kill -9 $PID
        fi
        
        echo "Password Vault Desktop stopped successfully!"
    else
        echo "Application is not running."
    fi
    
    # Clean up PID file
    rm -f .password-vault.pid
else
    echo "No PID file found. Attempting to find and stop Electron processes..."
    
    # Find and kill any running electron processes for this app
    pkill -f "electron.*password-vault" 2>/dev/null && echo "Stopped Electron processes."
fi

echo "Done." 