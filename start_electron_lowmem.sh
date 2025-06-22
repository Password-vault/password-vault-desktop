#!/bin/bash

# Ultra Low Memory Optimized Password Vault Desktop Launcher
# Optimized for systems with limited RAM (target: <1GB usage)

echo "Starting Password Vault Desktop (Ultra Low Memory Mode)..."

# Check available memory
available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
total_mem=$(free -m | awk 'NR==2{printf "%.0f", $2}')
echo "Available memory: ${available_mem}MB / Total: ${total_mem}MB"

if [ "$available_mem" -lt 300 ]; then
    echo "WARNING: Less than 300MB available memory. Performance may be severely affected."
    echo "Consider closing other applications before running Password Vault."
fi

# Set aggressive memory limits based on available memory
if [ "$total_mem" -lt 2048 ]; then
    # Ultra low memory mode for systems with <2GB RAM
    export NODE_OPTIONS="--max-old-space-size=128 --max-semi-space-size=8 --optimize-for-size"
    export V8_OPTIONS="--max-old-space-size=128"
    echo "Ultra low memory mode activated (target: <400MB usage)"
elif [ "$total_mem" -lt 4096 ]; then
    # Low memory mode for systems with 2-4GB RAM
    export NODE_OPTIONS="--max-old-space-size=256 --max-semi-space-size=16"
    export V8_OPTIONS="--max-old-space-size=256"
    echo "Low memory mode activated (target: <600MB usage)"
else
    # Standard low memory mode for systems with >4GB RAM
    export NODE_OPTIONS="--max-old-space-size=512"
    export V8_OPTIONS="--max-old-space-size=512"
    echo "Standard memory mode activated (target: <800MB usage)"
fi

# Disable unnecessary features
export ELECTRON_DISABLE_SECURITY_WARNINGS=true
export ELECTRON_NO_ASAR=true
export ELECTRON_ENABLE_LOGGING=false
export ELECTRON_DISABLE_HARDWARE_ACCELERATION=true

# Force garbage collection
export NODE_ENV=production

# Start with aggressive memory optimizations
echo "Launching with memory optimizations..."

# Use ultra-lowmem script if available, otherwise fallback to lowmem
if grep -q "start-ultra-lowmem" package.json 2>/dev/null; then
    npm run start-ultra-lowmem &
else
    npm run start-lowmem &
fi

# Store PID for monitoring
ELECTRON_PID=$!
echo "Password Vault PID: $ELECTRON_PID"

# Memory monitoring function
monitor_memory() {
    while kill -0 $ELECTRON_PID 2>/dev/null; do
        sleep 30
        if command -v ps >/dev/null 2>&1; then
            memory_usage=$(ps -o pid,vsz,rss,comm -p $ELECTRON_PID 2>/dev/null | tail -n +2)
            if [ ! -z "$memory_usage" ]; then
                rss_kb=$(echo "$memory_usage" | awk '{print $3}')
                rss_mb=$((rss_kb / 1024))
                echo "Current memory usage: ${rss_mb}MB"
                
                # Alert if memory usage exceeds target
                if [ "$rss_mb" -gt 1024 ]; then
                    echo "WARNING: Memory usage (${rss_mb}MB) exceeds 1GB target!"
                fi
            fi
        fi
    done
}

# Start memory monitoring in background
monitor_memory &
MONITOR_PID=$!

echo "Password Vault Desktop (Ultra Low Memory Mode) started!"
echo "Memory usage target: <1GB"
echo "PID: $ELECTRON_PID (Monitor PID: $MONITOR_PID)"
echo "To stop the application, run: ./stop_electron.sh"

# Wait for the main process
wait $ELECTRON_PID

# Clean up monitor process
kill $MONITOR_PID 2>/dev/null 