#!/bin/bash

# Password Vault Desktop Launcher with Memory Optimizations
# Optimized to stay under 1GB memory usage

echo "Starting Password Vault Desktop..."

# Check available memory
available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2}')
echo "Available memory: ${available_mem}MB / Total: ${total_mem}MB"

# Determine optimal memory settings
if [ "$total_mem" -lt 2048 ]; then
    echo "Low memory system detected. Using ultra-low memory mode."
    exec ./start_electron_lowmem.sh
    exit 0
elif [ "$total_mem" -lt 4096 ]; then
    # Medium memory optimization for 2-4GB systems
    export NODE_OPTIONS="--max-old-space-size=512"
    echo "Medium memory optimization activated (target: <800MB usage)"
else
    # Light memory optimization for >4GB systems
    export NODE_OPTIONS="--max-old-space-size=768"
    echo "Light memory optimization activated (target: <1GB usage)"
fi

# Set optimizations
export ELECTRON_DISABLE_SECURITY_WARNINGS=true
export NODE_ENV=production

# Launch with memory-optimized settings
echo "Launching Password Vault with memory optimizations..."

npm start &
ELECTRON_PID=$!
echo "Password Vault PID: $ELECTRON_PID"

# Simple memory monitoring
monitor_memory() {
    while kill -0 $ELECTRON_PID 2>/dev/null; do
        sleep 60  # Check every minute
        if command -v ps >/dev/null 2>&1; then
            memory_usage=$(ps -o rss -p $ELECTRON_PID 2>/dev/null | tail -n +2)
            if [ ! -z "$memory_usage" ]; then
                rss_mb=$((memory_usage / 1024))
                if [ "$rss_mb" -gt 1024 ]; then
                    echo "WARNING: Memory usage (${rss_mb}MB) exceeds 1GB target!"
                elif [ $(($(date +%s) % 300)) -eq 0 ]; then  # Log every 5 minutes
                    echo "Memory usage: ${rss_mb}MB"
                fi
            fi
        fi
    done
}

# Start monitoring in background
monitor_memory &
MONITOR_PID=$!

echo "Password Vault Desktop started!"
echo "Memory usage target: <1GB"
echo "To stop the application, run: ./stop_electron.sh"

# Wait for the main process
wait $ELECTRON_PID

# Clean up monitor process
kill $MONITOR_PID 2>/dev/null
