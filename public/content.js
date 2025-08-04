// Content script for Notez Chrome Extension
// Provides quick note modal and integrates with web pages

class NotezContentScript {
  constructor() {
    this.quickModal = null;
    this.isInitialized = false;
    this.selectionTooltip = null;
    this.selectedText = '';
    this.selectionRange = null; // Stores the actual Range object
    this.debugMode = true; // Enable debug logging
    this.isEnabled = true; // Default to enabled, will be checked
    this.tooltipShowTimeoutId = null; // To manage the delay before showing tooltip
    this.tooltipHideTimeoutId = null; // To manage the auto-hide timeout for the tooltip
    this.isProcessingSelection = false; // Flag to prevent immediate hide after show

    // Use a Promise to ensure DOM is ready before any operations
    this.ensureDOMReady().then(() => {
      this.log('DOM is ready. Checking URL enabled status...');
      this.checkUrlEnabled().then(() => {
        if (this.isEnabled) {
          this.log('Extension enabled for this URL. Initializing...');
          this.init();
        } else {
          this.log('Extension disabled for this URL: ' + window.location.href);
        }
      });
    });
  }

  async ensureDOMReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        if (document.body) { // Ensure body exists
          resolve();
        } else {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        }
      } else {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      }
    });
  }

  init() {
    if (this.isInitialized) {
      this.log('Notez content script already initialized, skipping re-initialization.');
      return;
    }

    this.log('Notez content script initializing...');
    this.setupMessageListeners();
    this.setupKeyboardShortcuts();
    this.setupSelectionHandling();
    this.isInitialized = true;

    this.log('Notez content script initialized on: ' + window.location.href);

    // Add debugging method to window for testing
    if (this.debugMode) {
      window.notezDebug = {
        testSelection: () => this.testSelectionFeature(),
        forceShowTooltip: () => this.forceShowTooltip(),
        hideTooltip: () => this.hideSelectionTooltip(),
        getSelection: () => window.getSelection().toString(),
        checkExtension: () => this.checkExtensionStatus(),
        simulateSelection: (text) => this.simulateSelection(text || 'Test selection text')
      };
      this.log('Debug methods added to window.notezDebug');
    }
  }

  log(message) {
    if (this.debugMode) {
      console.log('[Notez]', message);
    }
  }

  async checkUrlEnabled() {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        this.log('Chrome extension APIs not available in this context. Assuming disabled.');
        this.isEnabled = false;
        return;
      }

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'CHECK_URL_ENABLED',
          url: window.location.href
        }, (response) => {
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            this.log('Error from runtime.lastError during CHECK_URL_ENABLED: ' + errorMsg);
            reject(new Error(errorMsg));
          } else {
            resolve(response);
          }
        });
      });

      if (response && response.success) {
        this.isEnabled = response.data.enabled;
        this.log('URL enabled check result: ' + this.isEnabled);
      } else {
        this.log('Failed to check URL enabled status via background script. Response: ' + JSON.stringify(response) + '. Defaulting to enabled.');
        this.isEnabled = true;
      }
    } catch (error) {
      this.log('Error checking URL enabled status: ' + error.message + '. Defaulting to enabled.');
      this.isEnabled = true;
    }
  }

  testSelectionFeature() {
    this.log('Testing selection feature...');
    const selection = window.getSelection();
    const text = selection.toString().trim();
    this.log('Current selection: "' + text + '" (length: ' + text.length + ')');
    this.log('Selection rangeCount: ' + selection.rangeCount);

    if (text.length > 0 && selection.rangeCount > 0) {
      this.selectedText = text;
      this.selectionRange = selection.getRangeAt(0);
      const rect = this.selectionRange.getBoundingClientRect();
      this.log('Selection rect for test: ' + JSON.stringify(rect));
      this.showSelectionTooltipAtRect(rect);
    } else {
      this.log('No text selected for test. Please select some text first.');
      this.showNotification('Please select some text first', 'warning');
    }
  }

  forceShowTooltip() {
    this.log('Force showing tooltip at center of screen for debug.');
    const rect = {
      bottom: window.innerHeight / 2 + (window.pageYOffset || document.documentElement.scrollTop),
      left: window.innerWidth / 2 + (window.pageXOffset || document.documentElement.scrollLeft),
      width: 1,
      height: 1
    };
    this.selectedText = 'Debug Test Selection';
    this.showSelectionTooltipAtRect(rect);
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.log(`Received runtime message: ${message.type}`);
      switch (message.type) {
        case 'NOTEZ_NOTES_UPDATED':
          this.log('Received NOTEZ_NOTES_UPDATED. No immediate action in content script.');
          break;
        case 'NOTEZ_URL_PATTERNS_UPDATED':
          this.handleUrlPatternsUpdate(message.data);
          break;
        case 'NOTEZ_SHOW_QUICK_NOTE': // Handle this directly if background script sends it
          if (this.isEnabled) {
            this.showQuickNoteModal();
          }
          sendResponse({ success: true }); // Acknowledge receipt
          break;
        default:
          this.log('Unknown message type received: ' + message.type);
      }
    });

    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data || !event.data.type) return;
      this.log(`Received window message: ${event.data.type}`);
      switch (event.data.type) {
        case 'NOTEZ_SHOW_QUICK_NOTE':
          if (this.isEnabled) {
            this.showQuickNoteModal();
          } else {
            this.log('Attempted to show quick note, but extension is disabled for this URL.');
          }
          break;
        default:
          this.log('Unknown window message type received: ' + event.data.type);
      }
    });
  }

  handleUrlPatternsUpdate(urlPatterns) {
    this.log('URL patterns updated, rechecking current URL against new patterns.');
    this.checkUrlEnabled().then(() => {
      if (!this.isEnabled && this.isInitialized) {
        this.log('Extension is now disabled for this URL. Cleaning up existing features.');
        this.cleanup();
        this.isInitialized = false;
      } else if (this.isEnabled && !this.isInitialized) {
        this.log('Extension is now enabled for this URL. Initializing features.');
        this.init();
      } else {
        this.log('URL enabled status did not change or already initialized/cleaned up.');
      }
    });
  }

  cleanup() {
    this.log('Cleaning up extension on this page...');
    this.hideSelectionTooltip();
    this.hideQuickNoteModal();

    if (window.notezDebug) {
      delete window.notezDebug;
      this.log('Removed window.notezDebug');
    }
    this.log('Cleanup complete.');
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!this.isEnabled) return;

      const activeElement = document.activeElement;
      const isInputField = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        if (!isInputField) {
          e.preventDefault();
          this.showQuickNoteModal();
        } else {
          this.log('Keyboard shortcut blocked: Active element is an input field.');
        }
      }

      if (e.key === 'Escape') {
        if (this.quickModal && this.quickModal.style.display === 'flex') {
          e.preventDefault();
          this.hideQuickNoteModal();
        }
        if (this.selectionTooltip) {
          e.preventDefault();
          this.hideSelectionTooltip();
        }
      }
    });
  }

  setupSelectionHandling() {
    this.log('Setting up selection handling...');

    // Use a unified event listener for selection changes for robustness
    document.addEventListener('selectionchange', this.handleSelectionEvent.bind(this));

    // Refined click listener to hide tooltip only if click is truly outside selection or tooltip
    document.addEventListener('mousedown', (e) => {
      // If a tooltip exists and the click is outside of it
      if (this.selectionTooltip && !this.selectionTooltip.contains(e.target)) {
        // Also check if the click target is within the active selection range
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          // If the click happened *inside* the current selection, don't hide
          if (range.intersectsNode(e.target) || range.comparePoint) { // comparePoint check for text nodes
            try { // comparePoint might not be universally available or fail
              if (range.comparePoint(e.target, 0) <= 0 && range.comparePoint(e.target, e.target.childNodes.length) >= 0) {
                return; // Click is within the selected area, don't hide
              }
            } catch (err) {
              // Fallback or ignore if comparePoint fails
            }
          }
        }
        this.hideSelectionTooltip();
      }
    });

    // Hide tooltip on scroll - can cause tooltip to become misaligned
    document.addEventListener('scroll', () => {
      if (this.selectionTooltip) {
        this.log('Scroll detected, hiding selection tooltip to prevent misalignment.');
        this.hideSelectionTooltip();
      }
    }, true); // Use capture phase to catch scroll events early

    this.log('Selection handling set up with unified selectionchange listener and refined click/scroll listeners.');
  }

  handleSelectionEvent() {
    if (!this.isEnabled) {
      this.log('Selection handling ignored: Extension disabled for this URL.');
      return;
    }

    // Clear any pending show timeout to prevent multiple tooltips or race conditions
    if (this.tooltipShowTimeoutId) {
      clearTimeout(this.tooltipShowTimeoutId);
      this.tooltipShowTimeoutId = null;
    }

    const selection = window.getSelection();
    const text = selection.toString().trim();

    // Do not show tooltip if we're inside the quick note modal
    if (this.quickModal && this.quickModal.style.display === 'flex') {
      this.log('Selection detected but quick note modal is open. Hiding tooltip.');
      this.hideSelectionTooltip();
      return;
    }

    // Only show tooltip if there's actual text selected and it's not just a cursor change
    if (text.length > 0 && selection.rangeCount > 0) {
      // This flag helps differentiate between a click that starts a selection
      // and a subsequent click that should hide the tooltip.
      this.isProcessingSelection = true;
      this.log('Valid selection found: "' + text + '" (length: ' + text.length + ')');
      this.selectedText = text;
      this.selectionRange = selection.getRangeAt(0);

      const rect = this.selectionRange.getBoundingClientRect();
      this.log('Selection rect for tooltip: ' + JSON.stringify(rect));

      // Check for valid dimensions, sometimes selection on empty lines or hidden elements can yield 0x0 rect
      if (rect.width > 0 || rect.height > 0) {
        // Show the tooltip after a very short delay. This allows the browser to settle
        // after the selection and prevents the subsequent 'click' from hiding it too fast.
        this.tooltipShowTimeoutId = setTimeout(() => {
          // Re-check selection just before showing in case it changed during delay
          const currentSelection = window.getSelection();
          if (currentSelection.toString().trim() === this.selectedText && currentSelection.rangeCount > 0) {
            this.showSelectionTooltipAtRect(rect);
          } else {
            this.log('Selection changed or cleared during tooltip show delay, not showing tooltip.');
            this.hideSelectionTooltip(); // Ensure it's hidden if selection changed
          }
          this.isProcessingSelection = false; // Mark as done processing
        }, 50); // A very small delay, e.g., 50ms, often sufficient
      } else {
        this.log('Selection rect has zero dimensions. Hiding tooltip.');
        this.hideSelectionTooltip();
        this.isProcessingSelection = false;
      }
    } else {
      this.log('No text selected or selection cleared. Hiding tooltip.');
      this.hideSelectionTooltip();
      this.isProcessingSelection = false;
    }
  }

  showSelectionTooltipAtRect(rect) {
    this.log('showSelectionTooltipAtRect called with rect: ' + JSON.stringify(rect));
    this.hideSelectionTooltip(); // Hide any existing tooltip first

    this.selectionTooltip = document.createElement('div');
    this.selectionTooltip.className = 'notez-selection-tooltip';
    this.selectionTooltip.innerHTML = `
      <div class="notez-tooltip-content">
        <button class="notez-btn notez-btn-primary" id="notezAddToNote">
          📝 Add to Page Note
        </button>
      </div>
    `;

    document.body.appendChild(this.selectionTooltip);

    const tooltipWidth = this.selectionTooltip.offsetWidth;
    const tooltipHeight = this.selectionTooltip.offsetHeight;

    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + 10 + scrollY;
    let left = rect.left + scrollX;

    // Adjust if tooltip goes off right edge
    if (left + tooltipWidth > viewportWidth + scrollX - 20) {
      left = viewportWidth + scrollX - tooltipWidth - 20;
    }

    // Adjust if tooltip goes off left edge
    if (left < 20 + scrollX) {
      left = 20 + scrollX;
    }

    // Adjust if tooltip goes off bottom edge, move above selection
    if (top + tooltipHeight > viewportHeight + scrollY - 20) {
      top = rect.top - tooltipHeight - 10 + scrollY;
      if (top < 20 + scrollY) {
        top = 20 + scrollY;
      }
    }

    this.selectionTooltip.style.cssText = `
      position: absolute;
      top: ${top}px;
      left: ${left}px;
      z-index: 2147483647;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(37, 99, 235, 0.1);
      padding: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      white-space: nowrap;
      pointer-events: auto;
      animation: notezTooltipSlideIn 0.2s ease-out;
    `;

    this.log('Tooltip positioned at: top=' + top + ', left=' + left);

    const addToNoteBtn = this.selectionTooltip.querySelector('#notezAddToNote');

    if (addToNoteBtn) {
      addToNoteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // VERY IMPORTANT: Prevent click from bubbling up and hiding tooltip
        this.log('Add to note button clicked.');
        this.addSelectionToPageNote();
      });

      addToNoteBtn.style.cssText = `
        background: transparent;
        color: #333;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
      `;

      addToNoteBtn.addEventListener('mouseover', () => {
        addToNoteBtn.style.background = '#f0f0f0';
      });
      addToNoteBtn.addEventListener('mouseout', () => {
        addToNoteBtn.style.background = 'transparent';
      });
    } else {
      this.log('ERROR: Add to note button not found in tooltip markup.');
    }

    this.addTooltipAnimationStyles();

    // Auto-hide tooltip after a duration (e.g., 8 seconds) if not interacted with
    // Clear any previous auto-hide timeout when showing a new tooltip
    if (this.tooltipHideTimeoutId) {
      clearTimeout(this.tooltipHideTimeoutId);
    }
    this.tooltipHideTimeoutId = setTimeout(() => {
      if (this.selectionTooltip) {
        this.log('Auto-hiding tooltip after timeout.');
        this.hideSelectionTooltip();
      }
    }, 8000);
  }

  addTooltipAnimationStyles() {
    if (document.getElementById('notez-tooltip-keyframes')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'notez-tooltip-keyframes';
    style.textContent = `
      @keyframes notezTooltipSlideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes notezSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  hideSelectionTooltip() {
    if (this.selectionTooltip) {
      this.log('Hiding selection tooltip.');
      if (this.tooltipShowTimeoutId) {
        clearTimeout(this.tooltipShowTimeoutId);
        this.tooltipShowTimeoutId = null;
      }
      if (this.tooltipHideTimeoutId) {
        clearTimeout(this.tooltipHideTimeoutId);
        this.tooltipHideTimeoutId = null;
      }
      try {
        // Add a slight fade-out animation before removal
        this.selectionTooltip.style.opacity = '0';
        this.selectionTooltip.style.transition = 'opacity 0.2s ease-out';
        setTimeout(() => {
          if (this.selectionTooltip && this.selectionTooltip.parentNode) { // Check if still in DOM
            this.selectionTooltip.remove();
            this.log('Tooltip removed from DOM.');
          }
        }, 200); // Match transition duration

      } catch (error) {
        this.log('Error removing tooltip: ' + error.message);
      }
      this.selectionTooltip = null;
      this.selectedText = '';
      this.selectionRange = null;
    }
  }


  async addSelectionToPageNote() {
    this.log('DEBUG: addSelectionToPageNote called.');
    this.log('DEBUG: Current this.selectedText: "' + this.selectedText + '" (length: ' + this.selectedText.length + ')');

    const currentSelection = window.getSelection();
    const currentSelectionText = currentSelection.toString().trim();
    this.log('DEBUG: window.getSelection() result (length): ' + currentSelectionText.length);
    this.log('DEBUG: window.getSelection() result (text): "' + currentSelectionText + '"');
    this.log('DEBUG: window.getSelection() rangeCount: ' + currentSelection.rangeCount);

    if (currentSelectionText.length > 0 && currentSelection.rangeCount > 0) {
      this.selectedText = currentSelectionText;
      this.selectionRange = currentSelection.getRangeAt(0);
      this.log('DEBUG: Using live selection for addSelectionToPageNote.');
    } else if (!this.selectedText) {
      this.log('No valid selected text found for adding to note.');
      this.showNotification('❌ No text selected to add.', 'warning');
      this.hideSelectionTooltip();
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      this.log('Chrome extension APIs not available for message sending.');
      this.showNotification('❌ Extension not loaded properly', 'error');
      this.hideSelectionTooltip();
      return;
    }

    try {
      if (!chrome.runtime.id) {
        throw new Error('Extension context invalidated (chrome.runtime.id is undefined).');
      }
      this.log('Chrome runtime context appears valid: ' + chrome.runtime.id);
    } catch (error) {
      this.log('Extension context is invalid: ' + error.message);
      this.showNotification('❌ Extension needs to be reloaded (context invalid).', 'error');
      this.hideSelectionTooltip();
      return;
    }

    this.showNotification('Adding to page note...', 'info');

    try {
      this.log('Sending message to background script: ADD_SELECTION_TO_PAGE_NOTE');

      const messagePayload = {
        type: 'ADD_SELECTION_TO_PAGE_NOTE',
        data: {
          selectedText: this.selectedText,
          url: window.location.href,
          title: document.title || "Untitled Page",
          domain: window.location.hostname.replace('www.', '')
        }
      };

      const messageResponse = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Message to background script timed out after 5 seconds.'));
        }, 5000);

        chrome.runtime.sendMessage(messagePayload, (response) => {
          clearTimeout(timeoutId);
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            this.log('Error from chrome.runtime.lastError: ' + errorMsg);
            if (errorMsg.includes('receiving end does not exist') || errorMsg.includes('message port closed')) {
              reject(new Error('Extension background script might be unresponsive or reloaded. Please refresh the page.'));
            } else {
              reject(new Error(errorMsg));
            }
          } else {
            resolve(response);
          }
        });
      });

      this.log('Background script response: ' + JSON.stringify(messageResponse));

      if (messageResponse && messageResponse.success) {
        this.showNotification('✅ Added to page note!', 'success');
      } else {
        this.log('Failed response: ' + JSON.stringify(messageResponse));
        this.showNotification('❌ Failed to add to note', 'error');
      }
    } catch (error) {
      this.log('Error during addSelectionToPageNote: ' + error.message);
      if (error.message.includes('receiving end does not exist') || error.message.includes('message port closed')) {
        this.showNotification('❌ Extension background service unreachable. Please refresh the page.', 'error');
      } else if (error.message.includes('timed out')) {
        this.showNotification('❌ Request timed out. Please try again.', 'error');
      } else {
        this.showNotification(`❌ Error adding to note: ${error.message}`, 'error');
      }
    } finally {
      this.hideSelectionTooltip();

      try {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          this.log('Selection cleared successfully.');
        }
      } catch (error) {
        this.log('Error clearing selection: ' + error.message);
      }
    }
  }

  async createNoteFromSelection() {
    this.log('createNoteFromSelection called but disabled - use addSelectionToPageNote instead');
    this.showNotification('This feature is currently disabled. Selection added to page note.', 'info');
  }

  showQuickNoteModal() {
    if (!this.quickModal) {
      this.createQuickNoteModal();
    }

    this.quickModal.style.display = 'flex';
    document.body.classList.add('notez-modal-open');

    setTimeout(() => {
      const titleInput = this.quickModal.querySelector('#notez-quick-title');
      if (titleInput) titleInput.focus();
    }, 100);
    this.updateToolbarStates();
  }

  hideQuickNoteModal() {
    if (this.quickModal) {
      this.quickModal.style.display = 'none';
      document.body.classList.remove('notez-modal-open');
      this.clearModalForm();
    }
  }

  createQuickNoteModal() {
    this.quickModal = document.createElement('div');
    this.quickModal.id = 'notez-quick-modal';
    this.quickModal.className = 'notez-modal';
    this.quickModal.innerHTML = `
      <style>
        /* Basic Modal Styles - these should ideally be in a separate CSS file */
        .notez-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2147483647;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .notez-modal[style*="display: flex"] {
            opacity: 1;
            pointer-events: auto;
        }

        .notez-modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
        }

        .notez-modal-content {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1);
          width: 90%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
          transform: translateY(20px);
          opacity: 0;
          animation: notezModalSlideUp 0.3s forwards ease-out;
        }
        .notez-modal[style*="display: flex"] .notez-modal-content {
            animation: notezModalSlideUp 0.3s forwards ease-out;
        }

        .notez-modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notez-modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .notez-close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 5px 10px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .notez-close-btn:hover {
          background: #f0f0f0;
        }

        .notez-modal-body {
          padding: 20px;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .notez-title-input {
          width: 100%;
          padding: 10px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
          color: #333;
        }
        .notez-title-input::placeholder {
          color: #aaa;
        }
        .notez-title-input:focus {
          border-color: #3b82f6;
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .notez-editor {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 15px;
          min-height: 150px;
          max-height: 400px;
          overflow-y: auto;
          font-size: 15px;
          line-height: 1.6;
          color: #333;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          flex-grow: 1;
        }
        .notez-editor:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .notez-editor:empty:before {
          content: attr(data-placeholder);
          color: #aaa;
          pointer-events: none;
          display: block;
        }

        .notez-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          padding: 10px 0;
          border-top: 1px solid #eee;
          margin-top: 15px;
          justify-content: center;
        }
        .notez-toolbar-btn {
          background: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
          color: #555;
          min-width: 38px;
          text-align: center;
        }
        .notez-toolbar-btn:hover {
          background: #e0e0e0;
          border-color: #ccc;
        }
        .notez-toolbar-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          box-shadow: 0 2px 5px rgba(59, 130, 246, 0.3);
        }
        .notez-toolbar-divider {
          width: 1px;
          background-color: #eee;
          margin: 0 5px;
        }

        .notez-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .notez-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
          border: 1px solid transparent;
        }

        .notez-btn-primary {
          background-color: #3b82f6;
          color: white;
        }
        .notez-btn-primary:hover {
          background-color: #2563eb;
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
        }

        .notez-btn-secondary {
          background-color: #f0f0f0;
          color: #333;
          border-color: #ddd;
        }
        .notez-btn-secondary:hover {
          background-color: #e0e0e0;
          border-color: #ccc;
        }

        /* Styles for notification */
        .notez-notification {
            animation: notezSlideIn 0.3s ease-out forwards;
            opacity: 0;
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3b82f6; /* Default info color */
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 999999;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        /* Body class to prevent scrolling when modal is open */
        body.notez-modal-open {
            overflow: hidden !important;
            padding-right: var(--notez-scrollbar-width, 0px) !important;
        }

        @keyframes notezModalSlideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      </style>
      <div class="notez-modal-overlay"></div>
      <div class="notez-modal-content">
        <div class="notez-modal-header">
          <h3>Quick Note</h3>
          <button class="notez-close-btn" type="button" aria-label="Close note">×</button>
        </div>
        <div class="notez-modal-body">
          <input type="text" id="notez-quick-title" placeholder="Note title..." class="notez-title-input">
          <div id="notez-quick-editor" class="notez-editor" contenteditable="true" data-placeholder="Start typing your note..."></div>
          <div class="notez-toolbar">
            <button class="notez-toolbar-btn" data-command="bold" title="Bold (Ctrl+B)" type="button">
              <strong>B</strong>
            </button>
            <button class="notez-toolbar-btn" data-command="italic" title="Italic (Ctrl+I)" type="button">
              <em>I</em>
            </button>
            <button class="notez-toolbar-btn" data-command="underline" title="Underline (Ctrl+U)" type="button">
              <u>U</u>
            </button>
            <div class="notez-toolbar-divider"></div>
            <button class="notez-toolbar-btn" data-command="insertUnorderedList" title="Bullet List" type="button">
              • List
            </button>
            <button class="notez-toolbar-btn" data-command="insertOrderedList" title="Numbered List" type="button">
              1. List
            </button>
          </div>
        </div>
        <div class="notez-modal-footer">
          <button class="notez-btn notez-btn-secondary" id="notez-cancel-btn" type="button">Cancel</button>
          <button class="notez-btn notez-btn-primary" id="notez-save-btn" type="button">Save Note</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.quickModal);
    this.setupModalEventListeners();

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--notez-scrollbar-width', `${scrollbarWidth}px`);
  }

  setupModalEventListeners() {
    const closeBtn = this.quickModal.querySelector('.notez-close-btn');
    const cancelBtn = this.quickModal.querySelector('#notez-cancel-btn');
    const saveBtn = this.quickModal.querySelector('#notez-save-btn');
    const overlay = this.quickModal.querySelector('.notez-modal-overlay');
    const editor = this.quickModal.querySelector('#notez-quick-editor');

    closeBtn.addEventListener('click', () => this.hideQuickNoteModal());
    cancelBtn.addEventListener('click', () => this.hideQuickNoteModal());
    overlay.addEventListener('click', () => this.hideQuickNoteModal());

    saveBtn.addEventListener('click', () => this.saveQuickNote());

    this.quickModal.querySelectorAll('.notez-toolbar-btn[data-command]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.dataset.command;
        editor.focus();
        document.execCommand(command, false, null);
        this.updateToolbarStates();
      });
    });

    editor.addEventListener('keyup', () => this.updateToolbarStates());
    editor.addEventListener('mouseup', () => this.updateToolbarStates());
    editor.addEventListener('input', () => this.updateToolbarStates());

    this.quickModal.addEventListener('keydown', (e) => {
      const activeElement = document.activeElement;
      const isFocusedInModal = activeElement === this.quickModal.querySelector('#notez-quick-title') ||
        activeElement === this.quickModal.querySelector('#notez-quick-editor');

      if (isFocusedInModal && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.saveQuickNote();
      }
    });
  }

  updateToolbarStates() {
    const editor = this.quickModal.querySelector('#notez-quick-editor');
    if (!editor) return;

    this.quickModal.querySelectorAll('.notez-toolbar-btn[data-command]').forEach(btn => {
      const command = btn.dataset.command;
      try {
        const isActive = document.queryCommandState(command);
        btn.classList.toggle('active', isActive);
      } catch (e) {
        this.log(`Error checking command state for ${command}: ${e.message}`);
      }
    });
  }

  async saveQuickNote() {
    const titleInput = this.quickModal.querySelector('#notez-quick-title');
    const editor = this.quickModal.querySelector('#notez-quick-editor');

    const title = titleInput.value.trim() || 'Untitled Note';
    const content = editor.innerHTML.trim();

    if (!content && !title) {
      this.showNotification('Note is empty. Please add a title or content.', 'warning');
      return;
    }

    this.showNotification('Saving note...', 'info');

    try {
      const currentUrl = window.location.href;
      const currentTitle = document.title;

      const noteData = {
        title,
        content,
        tags: this.extractTags(content),
        source: {
          url: currentUrl,
          title: currentTitle,
          type: 'web'
        }
      };

      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        throw new Error('Chrome extension runtime is not available for sending messages.');
      }

      const response = await Promise.race([
        new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'SAVE_NOTE',
            data: noteData
          }, (response) => {
            if (chrome.runtime.lastError) {
              const errorMsg = chrome.runtime.lastError.message;
              this.log('Error during SAVE_NOTE sendMessage: ' + errorMsg);
              reject(new Error(errorMsg));
            } else {
              resolve(response);
            }
          });
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Note save request timed out.')), 10000))
      ]);

      if (response && response.success) {
        this.hideQuickNoteModal();
        this.showNotification('✅ Note saved!', 'success');
      } else {
        this.log('Failed response for saving note: ' + JSON.stringify(response));
        this.showNotification('❌ Error saving note', 'error');
      }
    } catch (error) {
      this.log('Error saving quick note:', error);
      if (error.message.includes('receiving end does not exist') || error.message.includes('message port closed')) {
        this.showNotification('❌ Extension background service unreachable. Please reload the page.', 'error');
      } else if (error.message.includes('timed out')) {
        this.showNotification('❌ Note save timed out. Please try again.', 'error');
      } else {
        this.showNotification(`❌ Error saving note: ${error.message}`, 'error');
      }
    }
  }

  clearModalForm() {
    if (!this.quickModal) return;

    const titleInput = this.quickModal.querySelector('#notez-quick-title');
    const editor = this.quickModal.querySelector('#notez-quick-editor');

    if (titleInput) titleInput.value = '';
    if (editor) editor.innerHTML = '';
    this.updateToolbarStates();
  }

  extractTags(content) {
    const tagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = content.match(tagRegex);
    return matches ? [...new Set(matches.map(tag => tag.slice(1)))] : [];
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notez-notification';
    notification.textContent = message;

    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      animation: notezSlideIn 0.3s ease-out forwards;
      opacity: 0;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'notezSlideOut 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);

    if (!document.getElementById('notez-slideout-keyframes')) {
      const style = document.createElement('style');
      style.id = 'notez-slideout-keyframes';
      style.textContent = `
        @keyframes notezSlideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  checkExtensionStatus() {
    const selection = window.getSelection();
    const status = {
      contentScriptLoaded: true,
      isInitialized: this.isInitialized,
      isEnabledForUrl: this.isEnabled,
      chromeAPIsAvailable: typeof chrome !== 'undefined' && !!chrome.runtime,
      selectionHandlerSetup: this.isInitialized && document.onselectionchange !== undefined,
      debugMode: this.debugMode,
      currentSelectedText: selection.toString(),
      currentSelectionRangeCount: selection.rangeCount,
      tooltipVisible: !!this.selectionTooltip,
      modalVisible: this.quickModal ? this.quickModal.style.display === 'flex' : false
    };

    this.log('Extension status: ' + JSON.stringify(status, null, 2));
    console.table(status);
    return status;
  }

  simulateSelection(text) {
    this.log('Simulating selection with text: "' + text + '"');
    this.selectedText = text;

    const div = document.createElement('div');
    div.textContent = text;
    document.body.appendChild(div);

    const range = document.createRange();
    range.selectNodeContents(div);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    this.handleSelectionEvent();

    setTimeout(() => {
      div.remove();
      selection.removeAllRanges();
      this.hideSelectionTooltip();
    }, 2000);

    this.log('Simulated selection. Check for tooltip.');
  }
}

let notezContentScriptInstance = null;

function initializeNotezContentScript() {
  if (notezContentScriptInstance) {
    console.warn("[Notez] Content script already initialized, preventing double initialization.");
    return;
  }

  try {
    notezContentScriptInstance = new NotezContentScript();
    notezContentScriptInstance.log("Main content script instance created.");
  } catch (error) {
    console.error("[Notez] Fatal error during content script instantiation:", error);
    setTimeout(() => {
      if (!notezContentScriptInstance) {
        console.log("[Notez] Retrying content script initialization after error...");
        initializeNotezContentScript();
      }
    }, 500);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNotezContentScript, { once: true });
} else {
  initializeNotezContentScript();
}

console.log('[Notez] Content script load process initiated on:', window.location.href);