# Running Password Vault on Raspberry Pi & Low-Resource Systems

## Resource Usage Analysis

### Normal Mode (Your Current System)
- **Memory Usage**: ~332MB RAM
- **CPU Usage**: ~2.3%
- **Processes**: 7-8 Electron processes
- **Impact on 2GB System**: 16.6% memory usage ❌ **Too High**

### Why Electron Uses Multiple Processes

Electron's multi-process architecture includes:
1. **Main Process** - Application logic and window management
2. **Renderer Process** - UI rendering (like a browser tab)
3. **GPU Process** - Hardware acceleration 
4. **Utility Processes** - Network, audio, etc.
5. **Zygote Processes** - Process spawning helpers

**Benefits**: Security, stability, crash isolation
**Drawbacks**: Higher memory usage

## Optimization Solutions

### 1. Low Memory Mode (Recommended for 2GB systems)

Use the new optimized launcher:
```bash
./start_electron_lowmem.sh
```

**Expected Resources**:
- Memory: ~150-200MB (7-10% of 2GB)
- Processes: 3-4 instead of 7-8
- CPU: Similar or slightly higher

### 2. Single Process Mode (For 1GB systems)

```bash
npm run start-pi
```

**Features**:
- Runs in single process mode
- Disables GPU acceleration
- Minimal memory footprint (~100-150MB)
- ⚠️ Less stable (one crash kills the app)

### 3. Command Line Options Explained

**Memory Optimizations**:
- `--single-process` - Run everything in one process
- `--disable-gpu` - No hardware acceleration  
- `--max-old-space-size=512` - Limit Node.js heap to 512MB
- `--disable-dev-shm-usage` - Use disk instead of shared memory

**Performance Optimizations**:
- `--disable-software-rasterizer` - Skip software rendering
- `--disable-background-timer-throttling` - Keep timers active
- `--no-sandbox` - Remove security sandbox overhead

## Alternative Approaches

### 1. Web Version
Convert to a lightweight web app:
- **Memory**: ~50-100MB
- **Technology**: Flask + SQLite + Basic HTML/CSS
- **Trade-off**: No desktop integration

### 2. CLI Version
Create a command-line interface:
- **Memory**: ~20-50MB
- **Technology**: Python + SQLite
- **Trade-off**: No GUI

### 3. PWA (Progressive Web App)
- **Memory**: ~80-120MB  
- **Technology**: Web technologies with offline support
- **Trade-off**: Browser-dependent

## Raspberry Pi Specific Tips

### 1. System Optimizations
```bash
# Increase GPU memory split
sudo raspi-config
# Advanced Options -> Memory Split -> 128

# Increase swap file
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 2. Monitor Resources
```bash
# Check memory usage
free -h

# Monitor app resources
htop -p $(pgrep -f "password-vault")

# Check app processes
ps aux | grep electron | grep password
```

### 3. Performance Tips
- Close other applications before starting
- Use SD card class 10 or better
- Enable hardware acceleration if available
- Consider running headless with VNC

## Memory Usage Comparison

| Mode | Memory | Processes | Best For |
|------|--------|-----------|----------|
| Normal | ~332MB | 7-8 | 8GB+ systems |
| Low Memory | ~180MB | 4-5 | 4GB systems |
| Single Process | ~120MB | 1-2 | 2GB systems |
| Raspberry Pi | ~100MB | 1-2 | 1-2GB systems |

## Troubleshooting

### App Won't Start
```bash
# Check Node.js version
node --version  # Should be 16+

# Check available memory
free -m

# Try minimal mode
electron . --single-process --no-sandbox
```

### High Memory Usage
```bash
# Kill and restart
pkill -f password-vault
./start_electron_lowmem.sh

# Check for memory leaks
top -p $(pgrep -f password-vault)
```

### Performance Issues
- Reduce window size (smaller = less memory)
- Disable animations in settings
- Close unused browser tabs
- Restart the app periodically

## Future Optimizations

1. **Database optimization** - Reduce SQLite memory footprint
2. **Code splitting** - Load features on demand  
3. **Image optimization** - Compress assets
4. **Native module alternatives** - Replace heavy dependencies

Would you like me to implement any of these optimizations or create the alternative versions? 