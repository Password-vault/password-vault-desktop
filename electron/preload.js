const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials),
  registerUser: (userData) => ipcRenderer.invoke('register-user', userData),
  logoutUser: () => ipcRenderer.invoke('logout-user'),
  checkAuth: () => ipcRenderer.invoke('check-auth'),
  
  // Navigation
  navigateToDashboard: () => ipcRenderer.invoke('navigate-to-dashboard'),
  
  // Password management
  getPasswords: (searchTerm) => ipcRenderer.invoke('get-passwords', searchTerm),
  addPassword: (passwordData) => ipcRenderer.invoke('add-password', passwordData),
  updatePassword: (id, passwordData) => ipcRenderer.invoke('update-password', { id, ...passwordData }),
  deletePassword: (id) => ipcRenderer.invoke('delete-password', id),
  copyPassword: (id) => ipcRenderer.invoke('copy-password', id),
  
  // Utility functions
  generatePassword: (options) => ipcRenderer.invoke('generate-password', options),
  showNotification: (message) => ipcRenderer.invoke('show-notification', message),
  
  // Import functionality
  importPasswords: (importData) => ipcRenderer.invoke('import-passwords', importData),
  
  // Export functionality
  exportPasswords: (exportOptions) => ipcRenderer.invoke('export-passwords', exportOptions),
  
  // Backup and restore
  createBackup: () => ipcRenderer.invoke('create-backup'),
  
  // Secure notes
  getSecureNotes: () => ipcRenderer.invoke('get-secure-notes'),
  addSecureNote: (noteData) => ipcRenderer.invoke('add-secure-note', noteData),
  updateSecureNote: (id, noteData) => ipcRenderer.invoke('update-secure-note', { id, ...noteData }),
  deleteSecureNote: (id) => ipcRenderer.invoke('delete-secure-note', id),
  
  // Navigation events
  onNavigate: (callback) => ipcRenderer.on('navigate-to', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Add custom CSS for better desktop integration
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    /* Custom scrollbars for desktop */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    
    /* Improve text selection */
    ::selection {
      background: #0078d4;
      color: white;
    }
    
    /* Better focus indicators */
    button:focus,
    input:focus,
    select:focus,
    textarea:focus {
      outline: 2px solid #0078d4;
      outline-offset: 2px;
    }
    
    /* Desktop-specific styles */
    body {
      user-select: text;
      -webkit-user-select: text;
    }
    
    /* Prevent text selection on buttons */
    button, .btn {
      user-select: none;
      -webkit-user-select: none;
    }
    
    /* Improve form styling */
    input, textarea, select {
      border-radius: 4px;
      transition: border-color 0.2s ease;
    }
    
    input:focus, textarea:focus, select:focus {
      border-color: #0078d4;
      box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
    }
  `;
  document.head.appendChild(style);
});

// Keyboard shortcuts for desktop
window.addEventListener('keydown', (event) => {
  // Ctrl+F for search (if search functionality exists)
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]');
    if (searchInput) {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  }
  
  // Escape to close modals
  if (event.key === 'Escape') {
    const modal = document.querySelector('.modal.show, .modal.fade.show');
    if (modal) {
      const closeButton = modal.querySelector('.btn-close, .close, button[data-dismiss="modal"]');
      if (closeButton) {
        closeButton.click();
      }
    }
  }
  
  // Enter to submit forms (when focus is on input)
  if (event.key === 'Enter' && !event.shiftKey) {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.tagName === 'INPUT' && activeElement.type !== 'textarea') {
      const form = activeElement.closest('form');
      if (form) {
        const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          event.preventDefault();
          submitButton.click();
        }
      }
    }
  }
});

// Right-click context menu improvements
window.addEventListener('contextmenu', (event) => {
  // Allow context menu on input fields and text areas
  const target = event.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return; // Allow default context menu
  }
  
  // Prevent context menu on other elements for better desktop feel
  if (!target.closest('a') && !window.getSelection().toString()) {
    event.preventDefault();
  }
});

// Add drag and drop support for files (if needed for future features)
window.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});

window.addEventListener('drop', (event) => {
  event.preventDefault();
  // Handle file drops here if needed
});

// Improve form validation UX
window.addEventListener('DOMContentLoaded', () => {
  // Add better validation styling
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (event) => {
      const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
      inputs.forEach(input => {
        if (!input.validity.valid) {
          input.classList.add('is-invalid');
        } else {
          input.classList.remove('is-invalid');
        }
      });
    });
    
    // Clear validation styling on input
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid') && input.validity.valid) {
          input.classList.remove('is-invalid');
        }
      });
    });
  });
}); 