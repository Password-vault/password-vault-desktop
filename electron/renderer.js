// Ultra-lightweight Desktop-specific JavaScript for Password Vault
// Optimized for minimal memory usage

class PasswordVaultDesktop {
  constructor() {
    this.memoryOptimized = true;
    this.animationsReduced = true;
    this.init();
  }

  init() {
    // Only essential features for memory optimization
    this.setupMemoryOptimizations();
    this.setupEssentialFeatures();
    this.setupKeyboardShortcuts();
    this.setupClipboard();
    this.startMemoryMonitoring();
  }

  // Memory optimization functions
  setupMemoryOptimizations() {
    // Add desktop class for CSS targeting
    document.body.classList.add('desktop-app', 'memory-optimized');

    // Disable heavy features
    this.disableHeavyFeatures();

    // Set up memory cleanup
    this.setupMemoryCleanup();

    // Reduce DOM complexity
    this.optimizeDOM();
  }

  disableHeavyFeatures() {
    // Disable animations and transitions for memory savings
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01s !important;
        animation-delay: 0s !important;
        transition-duration: 0.01s !important;
        transition-delay: 0s !important;
        will-change: auto !important;
      }
      
      /* Disable expensive visual effects */
      .card, .btn, .password-item {
        box-shadow: none !important;
        backdrop-filter: none !important;
        transform: none !important;
      }
      
      /* Simplify hover effects */
      .password-item:hover {
        background-color: #f8f9fa !important;
        transform: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);

    // Disable right-click context menu on non-input elements (simple version)
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.matches('input, textarea')) {
        e.preventDefault();
      }
    });

    // Disable drag and drop to save memory
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
    });
  }

  setupMemoryCleanup() {
    // Memory cleanup function
    this.memoryCleanup = () => {
      // Remove orphaned event listeners
      const oldElements = document.querySelectorAll('[data-cleanup="true"]');
      oldElements.forEach(el => el.remove());

      // Clear any cached data
      if (window.cachedData) {
        window.cachedData = null;
      }

      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }

      // Dispatch cleanup event for other components
      document.dispatchEvent(new CustomEvent('memory-cleanup'));
    };

    // Run cleanup every 2 minutes
    setInterval(this.memoryCleanup, 120000);

    // Listen for the global cleanup event from main process
    document.addEventListener('memory-cleanup', this.memoryCleanup);
  }

  optimizeDOM() {
    // Remove unused DOM elements periodically
    setInterval(() => {
      // Remove elements marked for cleanup
      const elementsToClean = document.querySelectorAll('.cleanup-ready');
      elementsToClean.forEach(el => el.remove());
      
      // Clear empty text nodes
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.trim() === '') {
          textNodes.push(node);
        }
      }
      
      // Limit cleanup to prevent performance issues
      textNodes.slice(0, 10).forEach(node => {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
    }, 300000); // Every 5 minutes
  }

  // Essential features only
  setupEssentialFeatures() {
    // Handle external links (lightweight version)
    document.addEventListener('click', (e) => {
      if (e.target.matches('a[href^="http"]')) {
        e.preventDefault();
        if (window.electronAPI?.openExternal) {
          window.electronAPI.openExternal(e.target.href);
        }
      }
    });

    // Simple dropdown functionality
    window.toggleDropdown = (event) => {
      event.preventDefault();
      const dropdown = event.target.closest('.dropdown');
      const menu = dropdown?.querySelector('.dropdown-menu');
      if (menu) {
        menu.classList.toggle('show');
        
        // Close other dropdowns
        document.querySelectorAll('.dropdown-menu.show').forEach(otherMenu => {
          if (otherMenu !== menu) {
            otherMenu.classList.remove('show');
          }
        });
      }
    };

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
          menu.classList.remove('show');
        });
      }
    });
  }

  // Lightweight keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + N: New password
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const addButton = document.querySelector('[onclick*="addPassword"], .btn-add-password');
        if (addButton) addButton.click();
      }

      // Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[name*="search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Escape: Close modals/dropdowns
      if (e.key === 'Escape') {
        // Close dropdowns
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
          menu.classList.remove('show');
        });
        
        // Clear search
        const searchInput = document.querySelector('input[type="search"]');
        if (searchInput?.value) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
        }
      }
    });
  }

  // Lightweight clipboard functionality
  setupClipboard() {
    window.copyToClipboard = async (text, button) => {
      try {
        if (window.electronAPI?.copyToClipboard) {
          await window.electronAPI.copyToClipboard(text);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
        }
        
        // Simple feedback
        if (button) {
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          button.style.background = '#28a745';
          setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
          }, 1500);
        }
      } catch (err) {
        console.warn('Copy failed:', err);
        // Fallback: show alert
        alert('Failed to copy to clipboard');
      }
    };
  }

  // Memory monitoring
  startMemoryMonitoring() {
    if (performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        const usedMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
        const limitMB = Math.round(memory.jsHeapSizeLimit / (1024 * 1024));
        
        // Log memory usage for debugging
        console.log(`Memory: ${usedMB}MB / ${limitMB}MB`);
        
        // Trigger cleanup if memory usage is high
        if (usedMB > limitMB * 0.8) {
          console.warn('High memory usage detected, triggering cleanup');
          this.memoryCleanup();
        }
      }, 60000); // Check every minute
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PasswordVaultDesktop();
  });
} else {
  new PasswordVaultDesktop();
}

// Global utility functions for backward compatibility
window.showPasswordGenerator = () => {
  if (window.electronAPI?.send) {
    window.electronAPI.send('navigate-to', 'generator');
  }
};

window.showBackupManagement = () => {
  if (window.electronAPI?.send) {
    window.electronAPI.send('navigate-to', 'backup');
  }
};

window.logout = () => {
  if (window.electronAPI?.send) {
    window.electronAPI.send('logout');
  }
}; 