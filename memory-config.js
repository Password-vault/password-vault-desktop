// Memory optimization configuration for Password Vault
// This file centralizes all memory-related settings and limits

const os = require('os');

class MemoryConfig {
  constructor() {
    this.totalMemoryGB = os.totalmem() / (1024 * 1024 * 1024);
    this.memoryProfile = this.determineMemoryProfile();
    this.config = this.getConfigForProfile();
  }

  determineMemoryProfile() {
    if (this.totalMemoryGB <= 1) {
      return 'ultra-low'; // <1GB RAM
    } else if (this.totalMemoryGB <= 2) {
      return 'very-low'; // 1-2GB RAM
    } else if (this.totalMemoryGB <= 4) {
      return 'low'; // 2-4GB RAM
    } else if (this.totalMemoryGB <= 8) {
      return 'medium'; // 4-8GB RAM
    } else {
      return 'high'; // >8GB RAM
    }
  }

  getConfigForProfile() {
    const configs = {
      'ultra-low': {
        targetMemoryMB: 200,
        maxOldSpaceSize: 96,
        maxSemiSpaceSize: 4,
        windowSize: { width: 800, height: 600 },
        disableAnimations: true,
        disableEffects: true,
        gcInterval: 15000, // 15 seconds
        cleanupInterval: 60000, // 1 minute
        electronArgs: [
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-web-security',
          '--no-sandbox',
          '--single-process',
          '--disable-features=VizDisplayCompositor,TranslateUI,AudioServiceOutOfProcess,MediaSession,PlatformNotifications,WebRTC',
          '--memory-pressure-off',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection'
        ]
      },
      'very-low': {
        targetMemoryMB: 300,
        maxOldSpaceSize: 128,
        maxSemiSpaceSize: 8,
        windowSize: { width: 900, height: 650 },
        disableAnimations: true,
        disableEffects: true,
        gcInterval: 30000, // 30 seconds
        cleanupInterval: 120000, // 2 minutes
        electronArgs: [
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-web-security',
          '--no-sandbox',
          '--single-process',
          '--disable-features=VizDisplayCompositor,TranslateUI,AudioServiceOutOfProcess',
          '--memory-pressure-off'
        ]
      },
      'low': {
        targetMemoryMB: 500,
        maxOldSpaceSize: 256,
        maxSemiSpaceSize: 16,
        windowSize: { width: 1000, height: 700 },
        disableAnimations: true,
        disableEffects: false,
        gcInterval: 60000, // 1 minute
        cleanupInterval: 180000, // 3 minutes
        electronArgs: [
          '--disable-gpu-sandbox',
          '--disable-software-rasterizer',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI,VizDisplayCompositor',
          '--memory-pressure-off',
          '--no-sandbox'
        ]
      },
      'medium': {
        targetMemoryMB: 700,
        maxOldSpaceSize: 512,
        maxSemiSpaceSize: 32,
        windowSize: { width: 1200, height: 800 },
        disableAnimations: false,
        disableEffects: false,
        gcInterval: 120000, // 2 minutes
        cleanupInterval: 300000, // 5 minutes
        electronArgs: [
          '--disable-gpu-sandbox',
          '--memory-pressure-off'
        ]
      },
      'high': {
        targetMemoryMB: 900,
        maxOldSpaceSize: 768,
        maxSemiSpaceSize: 64,
        windowSize: { width: 1400, height: 900 },
        disableAnimations: false,
        disableEffects: false,
        gcInterval: 300000, // 5 minutes
        cleanupInterval: 600000, // 10 minutes
        electronArgs: [
          '--disable-gpu-sandbox'
        ]
      }
    };

    return configs[this.memoryProfile];
  }

  getNodeOptions() {
    return [
      `--max-old-space-size=${this.config.maxOldSpaceSize}`,
      `--max-semi-space-size=${this.config.maxSemiSpaceSize}`,
      '--optimize-for-size'
    ].join(' ');
  }

  getElectronArgs() {
    const baseArgs = [
      `--max-old-space-size=${this.config.maxOldSpaceSize}`,
      `--js-flags="--max-old-space-size=${this.config.maxOldSpaceSize} --max-semi-space-size=${this.config.maxSemiSpaceSize} --optimize-for-size"`
    ];

    return [...baseArgs, ...this.config.electronArgs];
  }

  getBrowserWindowConfig() {
    return {
      ...this.config.windowSize,
      minWidth: Math.max(800, this.config.windowSize.width - 200),
      minHeight: Math.max(600, this.config.windowSize.height - 100),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        backgroundThrottling: false,
        offscreen: false,
        spellcheck: false,
        v8CacheOptions: 'none',
        experimentalFeatures: false,
        plugins: false,
        webgl: false,
        nodeIntegrationInSubFrames: false,
        sandbox: false,
        // Remove additionalArguments as they might interfere with preload
        // additionalArguments: this.getElectronArgs()
      },
      show: false,
      transparent: false,
      vibrancy: undefined,
      visualEffectState: 'inactive'
    };
  }

  shouldEnableGC() {
    return this.memoryProfile === 'ultra-low' || this.memoryProfile === 'very-low';
  }

  getGCInterval() {
    return this.config.gcInterval;
  }

  getCleanupInterval() {
    return this.config.cleanupInterval;
  }

  getTargetMemoryMB() {
    return this.config.targetMemoryMB;
  }

  shouldDisableAnimations() {
    return this.config.disableAnimations;
  }

  shouldDisableEffects() {
    return this.config.disableEffects;
  }

  getMemoryProfile() {
    return this.memoryProfile;
  }

  getTotalMemoryGB() {
    return this.totalMemoryGB;
  }

  printConfiguration() {
    console.log(`Memory Configuration:`);
    console.log(`  Total RAM: ${this.totalMemoryGB.toFixed(1)}GB`);
    console.log(`  Profile: ${this.memoryProfile}`);
    console.log(`  Target Memory: ${this.config.targetMemoryMB}MB`);
    console.log(`  Max Old Space: ${this.config.maxOldSpaceSize}MB`);
    console.log(`  Window Size: ${this.config.windowSize.width}x${this.config.windowSize.height}`);
    console.log(`  Animations Disabled: ${this.config.disableAnimations}`);
    console.log(`  Effects Disabled: ${this.config.disableEffects}`);
  }
}

module.exports = MemoryConfig; 