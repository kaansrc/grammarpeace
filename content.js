// Content script for GrammarWise
let floatingButton = null;
let grammarPanel = null;
let selectedText = '';
let selectionRange = null;
let originalElement = null; // Store the element that had the selection
let isProcessing = false; // Prevent multiple simultaneous operations

// Detect if we're on Google Docs
const isGoogleDocs = window.location.hostname === 'docs.google.com' && window.location.pathname.includes('/document/');

console.log('GrammarWise: Content script loaded successfully');
if (isGoogleDocs) {
  console.log('GrammarWise: Google Docs detected - Right-click menu is the recommended way to use this extension on Google Docs');

  // Show a one-time notification to the user
  if (window === window.top) {
    setTimeout(() => {
      chrome.storage.sync.get(['googleDocsNotificationShown'], (result) => {
        if (!result.googleDocsNotificationShown) {
          console.log('%c📝 GrammarWise on Google Docs\n\n✨ Use keyboard shortcut: Ctrl+Shift+G (Cmd+Shift+G on Mac)\n\nOR:\n\n1. Copy your text (Ctrl+C)\n2. Click the GrammarWise extension icon\n3. Paste and check grammar in the popup\n\nNote: Google Docs uses custom text rendering that prevents automatic text extraction.', 'background: #6366f1; color: white; padding: 12px; font-size: 13px; line-height: 1.6; border-radius: 8px;');
          chrome.storage.sync.set({ googleDocsNotificationShown: true });
        }
      });
    }, 2000);
  }
}

// Listen for messages from background script (for context menu and keyboard shortcut)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('GrammarWise: Received message:', request);

  // Handle keyboard shortcut trigger
  if (request.action === 'triggerFromKeyboard') {
    console.log('GrammarWise: Keyboard shortcut triggered (Ctrl+Shift+G)');

    // Try to get selected text
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (!text) {
      console.log('GrammarWise: No text selected for keyboard shortcut');
      const message = isGoogleDocs
        ? 'GrammarWise for Google Docs:\n\n1. Select your text\n2. Press Ctrl+C (or Cmd+C) to copy\n3. Click the GrammarWise extension icon\n4. Paste text into the popup\n\nNote: Google Docs uses custom text handling that prevents direct text extraction.'
        : 'Please select some text first, then press Ctrl+Shift+G (or Cmd+Shift+G on Mac).';
      alert(message);
      sendResponse({ success: false });
      return true;
    }

    selectedText = text;
    selectionRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    originalElement = document.activeElement;
    console.log('GrammarWise: Extracted text from keyboard shortcut:', text.substring(0, 50));

    // Show panel at top center
    showGrammarPanel(0, 0);
    sendResponse({ success: true });
    return true;
  }

  // Handle context menu trigger
  if (request.action === 'openPanelWithText' && request.text) {
    selectedText = request.text;
    console.log('GrammarWise: Opening panel with text:', selectedText.substring(0, 50));

    // For Google Docs, use a fixed top-center position since selection API doesn't work
    if (isGoogleDocs) {
      console.log('GrammarWise: Using Google Docs positioning');
      showGrammarPanel(0, 0);
      sendResponse({ success: true });
      return true;
    }

    // For other sites, try to get the current selection position
    const selection = window.getSelection();
    let x = window.innerWidth / 2;
    let y = 100;

    if (selection && selection.rangeCount > 0) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          x = rect.left;
          y = rect.bottom;
          selectionRange = range;
          originalElement = document.activeElement;
        }
      } catch (e) {
        console.log('GrammarWise: Could not get selection rect, using default position');
      }
    }

    showGrammarPanel(x, y);
    sendResponse({ success: true });
  }
  return true;
});

// Listen for text selection
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('selectionchange', handleSelectionChange);

// For Google Docs, also listen on capture phase and with a delay
if (isGoogleDocs) {
  document.addEventListener('mouseup', (event) => {
    // Google Docs selection happens asynchronously
    setTimeout(() => {
      handleTextSelection(event);
    }, 100);
  }, true); // Use capture phase

  // Also listen for Google Docs specific events
  document.addEventListener('click', (event) => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      if (text.length > 0) {
        console.log('GrammarWise: Google Docs click selection detected');
        handleTextSelection(event);
      }
    }, 150);
  }, true);
}

function handleSelectionChange() {
  // Don't hide button immediately - give user time to interact with it
  // Increase delay to 2 seconds to give more time to click
  setTimeout(() => {
    const selection = window.getSelection();
    // Don't hide if mouse is over the button
    if (selection.toString().trim().length === 0 && floatingButton) {
      // Check if mouse is hovering over button
      if (!floatingButton.matches(':hover')) {
        hideFloatingButton();
      }
    }
  }, 2000);
}

function handleTextSelection(event) {
  // Don't show button if clicking inside our own UI
  if (event.target.closest('#grammarwise-floating-button') ||
      event.target.closest('#grammarwise-panel')) {
    return;
  }

  const selection = window.getSelection();
  const text = selection.toString().trim();

  // Only log when text is actually selected (reduce noise)
  if (text.length > 0) {
    console.log('GrammarWise: Text selected:', text.substring(0, 50) + '...');
    selectedText = text;

    // Store the active element for later replacement
    originalElement = document.activeElement;

    try {
      selectionRange = selection.getRangeAt(0);
      const rect = selectionRange.getBoundingClientRect();

      // Use viewport coordinates (for fixed positioning)
      let x = rect.left;
      let y = rect.bottom;

      // Fallback to mouse event position if rect is invalid (at 0,0)
      if (rect.left === 0 && rect.top === 0 && rect.right === 0 && rect.bottom === 0) {
        console.log('GrammarWise: Invalid rect, using mouse position');
        // Convert page coordinates to viewport coordinates
        x = event.clientX;
        y = event.clientY;
      }

      console.log('GrammarWise: Rect:', rect);
      console.log('GrammarWise: Showing button at viewport coords', x, y);
      showFloatingButton(x, y);
    } catch (e) {
      console.error('GrammarWise: Error getting selection range:', e);
      // Fallback to mouse viewport position
      showFloatingButton(event.clientX, event.clientY);
    }
  } else {
    hideFloatingButton();
  }
}

function showFloatingButton(x, y) {
  hideFloatingButton();

  floatingButton = document.createElement('div');
  floatingButton.id = 'grammarwise-floating-button';

  // Force inline styles to ensure visibility
  // Making it EXTRA visible for debugging
  floatingButton.style.cssText = `
    position: fixed !important;
    left: ${x + 10}px !important;
    top: ${y + 10}px !important;
    z-index: 2147483647 !important;
    background: white !important;
    color: black !important;
    border-radius: 50% !important;
    width: 28px !important;
    height: 28px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
    border: 2px solid black !important;
    pointer-events: auto !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 16px !important;
    line-height: 1 !important;
  `;

  floatingButton.innerHTML = `✌️`;

  floatingButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('GrammarWise: Button clicked');
    const rect = floatingButton.getBoundingClientRect();
    await showGrammarPanel(rect.left + window.scrollX, rect.top + window.scrollY);
  });

  document.body.appendChild(floatingButton);

  // Verify it's visible
  setTimeout(() => {
    if (floatingButton && document.body.contains(floatingButton)) {
      const computed = window.getComputedStyle(floatingButton);
      console.log('GrammarWise: Button computed style:', {
        display: computed.display,
        opacity: computed.opacity,
        visibility: computed.visibility,
        zIndex: computed.zIndex,
        position: computed.position,
        left: computed.left,
        top: computed.top
      });
      console.log('GrammarWise: Button should be visible at these coordinates!');
    } else {
      console.log('GrammarWise: Button was removed from DOM before verification');
    }
  }, 50);

  console.log('GrammarWise: Floating button added to DOM at viewport coordinates', x, y);
}

function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.remove();
    floatingButton = null;
  }
}

// Helper function to send message with retry logic
async function sendMessageWithRetry(message, maxRetries = 3, delayMs = 100) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if runtime ID exists
      if (!chrome.runtime?.id) {
        if (attempt < maxRetries) {
          console.log(`GrammarWise: Runtime ID not found, retry ${attempt}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
          continue;
        }
        return null;
      }

      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      console.log(`GrammarWise: Message failed (attempt ${attempt}/${maxRetries}):`, error.message);

      if (attempt < maxRetries) {
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      } else {
        console.error('GrammarWise: All retry attempts failed');
        return null;
      }
    }
  }
  return null;
}

// Validate extension context by attempting to communicate with background script
async function validateExtensionContext() {
  const response = await sendMessageWithRetry({ action: 'ping' }, 3, 100);
  return response && response.success;
}

async function showGrammarPanel(x, y) {
  console.log('GrammarWise: Showing panel at', x, y);

  // Validate extension context before showing panel
  const isValid = await validateExtensionContext();
  if (!isValid) {
    console.error('GrammarWise: Extension context invalidated');
    alert('GrammarWise: Extension was reloaded.\n\nPlease refresh this page (F5) to continue using the extension.');
    return;
  }

  hideGrammarPanel();
  hideFloatingButton();

  grammarPanel = document.createElement('div');
  grammarPanel.id = 'grammarwise-panel';
  grammarPanel.innerHTML = `
    <div class="grammarwise-header">
      <h3>GrammarWise</h3>
      <button id="grammarwise-close" class="grammarwise-close-btn">&times;</button>
    </div>
    <div class="grammarwise-tabs">
      <button class="grammarwise-tab active" data-tab="grammar">Grammar</button>
      <button class="grammarwise-tab" data-tab="tone">Tone</button>
      <button class="grammarwise-tab" data-tab="translate">Translate</button>
    </div>
    <div class="grammarwise-content">
      <!-- Grammar Tab -->
      <div id="grammarwise-tab-grammar" class="grammarwise-tab-content active">
        <div class="grammarwise-controls">
          <label for="grammarwise-language">Language:</label>
          <select id="grammarwise-language" class="grammarwise-select">
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
            <option value="tr">Turkish</option>
            <option value="nl">Dutch</option>
            <option value="pl">Polish</option>
          </select>
          <button id="grammarwise-check" class="grammarwise-btn-primary">Check Grammar</button>
        </div>
        <div class="grammarwise-original">
          <strong>Original:</strong>
          <div class="grammarwise-text">${escapeHtml(selectedText)}</div>
        </div>
        <div id="grammarwise-result" class="grammarwise-result" style="display: none;">
          <strong>Corrected:</strong>
          <div id="grammarwise-corrected-text" class="grammarwise-text"></div>
          <div class="grammarwise-actions">
            <button id="grammarwise-copy" class="grammarwise-btn">Copy</button>
            <button id="grammarwise-replace" class="grammarwise-btn-primary">Replace</button>
          </div>
        </div>
        <div id="grammarwise-loading" class="grammarwise-loading" style="display: none;">
          <div class="grammarwise-spinner"></div>
          <p>Checking grammar...</p>
        </div>
        <div id="grammarwise-error" class="grammarwise-error" style="display: none;"></div>
      </div>

      <!-- Tone Tab -->
      <div id="grammarwise-tab-tone" class="grammarwise-tab-content" style="display: none;">
        <div class="grammarwise-controls">
          <label for="grammarwise-tone">Tone:</label>
          <select id="grammarwise-tone" class="grammarwise-select">
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
            <option value="concise">Concise</option>
            <option value="clear">Clear & Improved</option>
          </select>
          <button id="grammarwise-rewrite-tone" class="grammarwise-btn-primary">Rewrite</button>
        </div>
        <div class="grammarwise-original">
          <strong>Original:</strong>
          <div class="grammarwise-text">${escapeHtml(selectedText)}</div>
        </div>
        <div id="grammarwise-tone-result" class="grammarwise-result" style="display: none;">
          <strong>Rewritten:</strong>
          <div id="grammarwise-rewritten-text" class="grammarwise-text"></div>
          <div class="grammarwise-actions">
            <button id="grammarwise-tone-copy" class="grammarwise-btn">Copy</button>
            <button id="grammarwise-tone-replace" class="grammarwise-btn-primary">Replace</button>
          </div>
        </div>
        <div id="grammarwise-tone-loading" class="grammarwise-loading" style="display: none;">
          <div class="grammarwise-spinner"></div>
          <p>Rewriting with tone...</p>
        </div>
        <div id="grammarwise-tone-error" class="grammarwise-error" style="display: none;"></div>
      </div>

      <!-- Translate Tab -->
      <div id="grammarwise-tab-translate" class="grammarwise-tab-content" style="display: none;">
        <div class="grammarwise-controls">
          <label for="grammarwise-from-lang">From:</label>
          <select id="grammarwise-from-lang" class="grammarwise-select">
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
            <option value="tr">Turkish</option>
            <option value="nl">Dutch</option>
            <option value="pl">Polish</option>
          </select>
          <label for="grammarwise-to-lang">To:</label>
          <select id="grammarwise-to-lang" class="grammarwise-select">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
            <option value="tr">Turkish</option>
            <option value="nl">Dutch</option>
            <option value="pl">Polish</option>
          </select>
          <button id="grammarwise-translate" class="grammarwise-btn-primary">Translate</button>
        </div>
        <div class="grammarwise-original">
          <strong>Original:</strong>
          <div class="grammarwise-text">${escapeHtml(selectedText)}</div>
        </div>
        <div id="grammarwise-translate-result" class="grammarwise-result" style="display: none;">
          <strong>Translation:</strong>
          <div id="grammarwise-translated-text" class="grammarwise-text"></div>
          <div class="grammarwise-actions">
            <button id="grammarwise-translate-copy" class="grammarwise-btn">Copy</button>
            <button id="grammarwise-translate-replace" class="grammarwise-btn-primary">Replace</button>
          </div>
        </div>
        <div id="grammarwise-translate-loading" class="grammarwise-loading" style="display: none;">
          <div class="grammarwise-spinner"></div>
          <p>Translating...</p>
        </div>
        <div id="grammarwise-translate-error" class="grammarwise-error" style="display: none;"></div>
      </div>
    </div>
  `;

  // Position panel at top center of viewport
  const panelWidth = 400;
  const padding = 20;

  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Center horizontally
  const panelX = (viewportWidth - panelWidth) / 2;

  // Position at top
  const panelY = padding;

  // Calculate max height (leave room for padding at bottom)
  const maxHeight = viewportHeight - padding * 2;

  // Apply positioning with fixed position and max-height
  grammarPanel.style.cssText = `
    position: fixed !important;
    left: ${panelX}px !important;
    top: ${panelY}px !important;
    max-height: ${maxHeight}px !important;
    width: 400px !important;
    display: flex !important;
    flex-direction: column !important;
  `;

  document.body.appendChild(grammarPanel);
  console.log('GrammarWise: Panel added to DOM at top center', panelX, panelY, 'with max-height', maxHeight);

  // Load default settings with error handling
  // Check if extension context is valid before accessing storage
  if (chrome.runtime?.id) {
    chrome.storage.sync.get(['defaultTone', 'defaultGrammarLang', 'defaultFromLang', 'defaultToLang'], (result) => {
      // Check for chrome.runtime errors
      if (chrome.runtime.lastError) {
        console.warn('GrammarWise: Could not load settings:', chrome.runtime.lastError.message);
        return;
      }

      // Safely set values only if elements exist
      const languageSelect = document.getElementById('grammarwise-language');
      const toneSelect = document.getElementById('grammarwise-tone');
      const fromLangSelect = document.getElementById('grammarwise-from-lang');
      const toLangSelect = document.getElementById('grammarwise-to-lang');

      if (result.defaultGrammarLang && languageSelect) {
        languageSelect.value = result.defaultGrammarLang;
      }
      if (result.defaultTone && toneSelect) {
        toneSelect.value = result.defaultTone;
      }
      if (result.defaultFromLang && fromLangSelect) {
        fromLangSelect.value = result.defaultFromLang;
      }
      if (result.defaultToLang && toLangSelect) {
        toLangSelect.value = result.defaultToLang;
      }
    });
  } else {
    console.warn('GrammarWise: Extension context invalidated, using default settings');
  }

  // Add tab switching
  const tabs = grammarPanel.querySelectorAll('.grammarwise-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      grammarPanel.querySelectorAll('.grammarwise-tab').forEach(t => t.classList.remove('active'));
      grammarPanel.querySelectorAll('.grammarwise-tab-content').forEach(c => c.style.display = 'none');

      // Add active class to clicked tab
      tab.classList.add('active');

      // Show corresponding content
      const tabName = tab.getAttribute('data-tab');
      const content = grammarPanel.querySelector(`#grammarwise-tab-${tabName}`);
      if (content) {
        content.style.display = 'block';
      }
    });
  });

  // Add event listeners
  const closeBtn = document.getElementById('grammarwise-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('GrammarWise: Close button clicked');
    hideGrammarPanel();
  });

  // Grammar tab event listeners
  document.getElementById('grammarwise-check').addEventListener('click', checkGrammar);

  const copyBtn = document.getElementById('grammarwise-copy');
  const replaceBtn = document.getElementById('grammarwise-replace');

  if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
  if (replaceBtn) replaceBtn.addEventListener('click', replaceText);

  // Tone rewrite event listeners
  document.getElementById('grammarwise-rewrite-tone').addEventListener('click', rewriteWithTone);

  const toneCopyBtn = document.getElementById('grammarwise-tone-copy');
  const toneReplaceBtn = document.getElementById('grammarwise-tone-replace');

  if (toneCopyBtn) toneCopyBtn.addEventListener('click', copyToneResult);
  if (toneReplaceBtn) toneReplaceBtn.addEventListener('click', replaceToneResult);

  // Translate tab event listeners
  document.getElementById('grammarwise-translate').addEventListener('click', translateText);

  const translateCopyBtn = document.getElementById('grammarwise-translate-copy');
  const translateReplaceBtn = document.getElementById('grammarwise-translate-replace');

  if (translateCopyBtn) translateCopyBtn.addEventListener('click', copyTranslation);
  if (translateReplaceBtn) translateReplaceBtn.addEventListener('click', replaceWithTranslation);

  // Click outside to close (with small delay to prevent immediate closing)
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 100);

  // Automatically trigger grammar check when panel opens
  setTimeout(() => {
    checkGrammar();
  }, 150);
}

function handleOutsideClick(event) {
  if (grammarPanel && !grammarPanel.contains(event.target)) {
    hideGrammarPanel();
  }
}

function hideGrammarPanel() {
  if (grammarPanel) {
    document.removeEventListener('click', handleOutsideClick);
    grammarPanel.remove();
    grammarPanel = null;
    isProcessing = false; // Reset processing flag when panel is closed
  }
}

async function checkGrammar() {
  // Prevent multiple simultaneous operations
  if (isProcessing) {
    console.log('GrammarWise: Already processing, ignoring request');
    return;
  }

  console.log('GrammarWise: Checking grammar...');
  isProcessing = true;

  const language = document.getElementById('grammarwise-language').value;
  const loadingDiv = document.getElementById('grammarwise-loading');
  const resultDiv = document.getElementById('grammarwise-result');
  const errorDiv = document.getElementById('grammarwise-error');

  // Show loading
  loadingDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  errorDiv.style.display = 'none';

  try {
    // Send message to background script with retry logic
    const response = await sendMessageWithRetry({
      action: 'checkGrammar',
      text: selectedText,
      language: language
    });

    console.log('GrammarWise: Received response:', response);
    loadingDiv.style.display = 'none';

    if (response && response.success) {
      if (response.noChanges) {
        // Show success message when no changes needed
        const resultContent = document.getElementById('grammarwise-corrected-text');
        resultContent.innerHTML = `<div style="color: #059669; font-weight: 500; padding: 12px; background: #d1fae5; border-radius: 6px; text-align: center;">✓ ${response.message}</div>`;
        // Hide the action buttons since there's nothing to copy/replace
        const actions = resultDiv.querySelector('.grammarwise-actions');
        if (actions) actions.style.display = 'none';
        resultDiv.style.display = 'block';
      } else {
        // Show corrected text with action buttons
        document.getElementById('grammarwise-corrected-text').textContent = response.correctedText;
        const actions = resultDiv.querySelector('.grammarwise-actions');
        if (actions) actions.style.display = 'flex';
        resultDiv.style.display = 'block';
      }
    } else if (response && response.error) {
      showError(response.error);
    } else {
      showError('Failed to check grammar. Please refresh the page and try again.');
    }
  } catch (error) {
    console.error('GrammarWise: Error during grammar check:', error);
    loadingDiv.style.display = 'none';
    showError(error.message || 'An error occurred');
  } finally {
    isProcessing = false;
  }
}

async function rewriteWithTone() {
  // Prevent multiple simultaneous operations
  if (isProcessing) {
    console.log('GrammarWise: Already processing, ignoring request');
    return;
  }

  console.log('GrammarWise: Rewriting with tone...');
  isProcessing = true;

  const tone = document.getElementById('grammarwise-tone').value;
  const loadingDiv = document.getElementById('grammarwise-tone-loading');
  const resultDiv = document.getElementById('grammarwise-tone-result');
  const errorDiv = document.getElementById('grammarwise-tone-error');

  // Show loading
  loadingDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  errorDiv.style.display = 'none';

  try {
    // Send message to background script with retry logic
    const response = await sendMessageWithRetry({
      action: 'rewriteWithTone',
      text: selectedText,
      tone: tone
    });

    console.log('GrammarWise: Received tone rewrite response:', response);
    loadingDiv.style.display = 'none';

    if (response && response.success) {
      document.getElementById('grammarwise-rewritten-text').textContent = response.rewrittenText;
      resultDiv.style.display = 'block';
    } else if (response && response.error) {
      showToneError(response.error);
    } else {
      showToneError('Failed to rewrite with tone. Please refresh the page and try again.');
    }
  } catch (error) {
    console.error('GrammarWise: Error during tone rewrite:', error);
    loadingDiv.style.display = 'none';
    showToneError(error.message || 'An error occurred');
  } finally {
    isProcessing = false;
  }
}

function showError(message) {
  const errorDiv = document.getElementById('grammarwise-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function showToneError(message) {
  const errorDiv = document.getElementById('grammarwise-tone-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function copyToClipboard() {
  const correctedText = document.getElementById('grammarwise-corrected-text').textContent;
  navigator.clipboard.writeText(correctedText).then(() => {
    const btn = document.getElementById('grammarwise-copy');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('GrammarWise: Failed to copy text:', err);
    showError('Failed to copy to clipboard');
  });
}

function replaceText() {
  const correctedText = document.getElementById('grammarwise-corrected-text').textContent;
  console.log('GrammarWise: Attempting to replace text');
  console.log('GrammarWise: Original element:', originalElement);

  // Try multiple strategies to replace text
  let replaced = false;

  // Strategy 1: Use stored originalElement if it's editable
  if (originalElement && document.body.contains(originalElement)) {
    console.log('GrammarWise: Trying strategy 1 - stored element');

    // Focus the element first
    try {
      originalElement.focus();
    } catch (e) {
      console.log('GrammarWise: Could not focus original element');
    }

    // Check if it's a textarea or input
    if (originalElement.tagName === 'TEXTAREA' || originalElement.tagName === 'INPUT') {
      try {
        const start = originalElement.selectionStart;
        const end = originalElement.selectionEnd;
        const text = originalElement.value;

        // Replace the text
        originalElement.value = text.substring(0, start) + correctedText + text.substring(end);
        originalElement.selectionStart = originalElement.selectionEnd = start + correctedText.length;

        // Trigger input event for frameworks like React
        originalElement.dispatchEvent(new Event('input', { bubbles: true }));
        originalElement.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('GrammarWise: Successfully replaced in textarea/input');
        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
        console.error('GrammarWise: Error replacing in textarea/input:', e);
      }
    }

    // Check if it's contentEditable
    if (originalElement.isContentEditable) {
      try {
        // Try to restore selection
        if (selectionRange) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(selectionRange);
        }

        // Use execCommand to insert text
        const success = document.execCommand('insertText', false, correctedText);
        if (success) {
          console.log('GrammarWise: Successfully replaced in contentEditable');
          replaced = true;
          hideGrammarPanel();
          return;
        }
      } catch (e) {
        console.error('GrammarWise: Error with execCommand:', e);
      }
    }
  }

  // Strategy 2: Try current activeElement
  if (!replaced) {
    console.log('GrammarWise: Trying strategy 2 - current activeElement');
    const activeElement = document.activeElement;

    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      try {
        const start = activeElement.selectionStart || 0;
        const end = activeElement.selectionEnd || 0;
        const text = activeElement.value;

        activeElement.value = text.substring(0, start) + correctedText + text.substring(end);
        activeElement.selectionStart = activeElement.selectionEnd = start + correctedText.length;

        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        activeElement.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('GrammarWise: Successfully replaced in current activeElement');
        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
        console.error('GrammarWise: Error with activeElement:', e);
      }
    }

    if (activeElement && activeElement.isContentEditable) {
      try {
        if (selectionRange) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(selectionRange);
        }
        document.execCommand('insertText', false, correctedText);
        console.log('GrammarWise: Successfully replaced in current contentEditable');
        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
        console.error('GrammarWise: Error with current contentEditable:', e);
      }
    }
  }

  // Strategy 3: Try using selection range directly
  if (!replaced && selectionRange) {
    console.log('GrammarWise: Trying strategy 3 - selection range');
    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(selectionRange);

      // Try execCommand one more time
      const success = document.execCommand('insertText', false, correctedText);
      if (success) {
        console.log('GrammarWise: Successfully replaced using selection range');
        replaced = true;
        hideGrammarPanel();
        return;
      }
    } catch (e) {
      console.error('GrammarWise: Error with selection range:', e);
    }
  }

  // Strategy 4: Google Docs specific handling
  if (!replaced && isGoogleDocs) {
    console.log('GrammarWise: Trying strategy 4 - Google Docs specific');
    try {
      // Copy corrected text to clipboard
      navigator.clipboard.writeText(correctedText).then(() => {
        console.log('GrammarWise: Text copied, attempting to paste in Google Docs');

        // Try to restore the selection first
        if (selectionRange) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(selectionRange);
        }

        // Simulate Ctrl+V to paste
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer()
        });
        pasteEvent.clipboardData.setData('text/plain', correctedText);

        // Try to dispatch paste event on the editor
        const editor = document.querySelector('.kix-canvas-tile-content, [contenteditable="true"]');
        if (editor) {
          editor.dispatchEvent(pasteEvent);
          console.log('GrammarWise: Paste event dispatched to Google Docs editor');
          replaced = true;
          hideGrammarPanel();
          return;
        }
      }).catch(err => {
        console.error('GrammarWise: Clipboard error:', err);
      });
    } catch (e) {
      console.error('GrammarWise: Google Docs paste error:', e);
    }
  }

  // If all strategies failed, fallback to clipboard
  if (!replaced) {
    console.log('GrammarWise: All replace strategies failed, copying to clipboard');
    copyToClipboard();

    if (isGoogleDocs) {
      showError('Text copied! Press Ctrl+V (or Cmd+V) to paste in Google Docs.');
    } else {
      showError('Text copied to clipboard. Paste it manually in the desired location.');
    }
  }
}

function copyToneResult() {
  const rewrittenText = document.getElementById('grammarwise-rewritten-text').textContent;
  navigator.clipboard.writeText(rewrittenText).then(() => {
    const btn = document.getElementById('grammarwise-tone-copy');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('GrammarWise: Failed to copy tone result:', err);
    showToneError('Failed to copy to clipboard');
  });
}

function replaceToneResult() {
  const rewrittenText = document.getElementById('grammarwise-rewritten-text').textContent;
  console.log('GrammarWise: Attempting to replace with rewritten text');

  // Use the same replacement logic as replaceText
  let replaced = false;

  // Strategy 1: Use stored originalElement if it's editable
  if (originalElement && document.body.contains(originalElement)) {
    try {
      originalElement.focus();
    } catch (e) {
      console.log('GrammarWise: Could not focus original element');
    }

    if (originalElement.tagName === 'TEXTAREA' || originalElement.tagName === 'INPUT') {
      try {
        const start = originalElement.selectionStart;
        const end = originalElement.selectionEnd;
        const text = originalElement.value;

        originalElement.value = text.substring(0, start) + rewrittenText + text.substring(end);
        originalElement.selectionStart = originalElement.selectionEnd = start + rewrittenText.length;

        originalElement.dispatchEvent(new Event('input', { bubbles: true }));
        originalElement.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('GrammarWise: Successfully replaced with rewritten text');
        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
        console.error('GrammarWise: Error replacing text:', e);
      }
    }

    if (originalElement.isContentEditable) {
      try {
        if (selectionRange) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(selectionRange);
        }
        const success = document.execCommand('insertText', false, rewrittenText);
        if (success) {
          console.log('GrammarWise: Successfully replaced with rewritten text in contentEditable');
          replaced = true;
          hideGrammarPanel();
          return;
        }
      } catch (e) {
        console.error('GrammarWise: Error with execCommand:', e);
      }
    }
  }

  // Fallback to clipboard
  if (!replaced) {
    console.log('GrammarWise: Replace failed, copying to clipboard');
    copyToneResult();
    showToneError('Text copied to clipboard. Paste it manually in the desired location.');
  }
}

async function translateText() {
  // Prevent multiple simultaneous operations
  if (isProcessing) {
    console.log('GrammarWise: Already processing, ignoring request');
    return;
  }

  console.log('GrammarWise: Translating text...');
  isProcessing = true;

  const fromLang = document.getElementById('grammarwise-from-lang').value;
  const toLang = document.getElementById('grammarwise-to-lang').value;
  const loadingDiv = document.getElementById('grammarwise-translate-loading');
  const resultDiv = document.getElementById('grammarwise-translate-result');
  const errorDiv = document.getElementById('grammarwise-translate-error');

  // Show loading
  loadingDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  errorDiv.style.display = 'none';

  try {
    // Send message to background script with retry logic
    const response = await sendMessageWithRetry({
      action: 'translateText',
      text: selectedText,
      fromLang: fromLang,
      toLang: toLang
    });

    console.log('GrammarWise: Received translation response:', response);
    loadingDiv.style.display = 'none';

    if (response && response.success) {
      document.getElementById('grammarwise-translated-text').textContent = response.translatedText;
      resultDiv.style.display = 'block';
    } else if (response && response.error) {
      showTranslateError(response.error);
    } else {
      showTranslateError('Failed to translate. Please refresh the page and try again.');
    }
  } catch (error) {
    console.error('GrammarWise: Error during translation:', error);
    loadingDiv.style.display = 'none';
    showTranslateError(error.message || 'An error occurred');
  } finally {
    isProcessing = false;
  }
}

function showTranslateError(message) {
  const errorDiv = document.getElementById('grammarwise-translate-error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function copyTranslation() {
  const translatedText = document.getElementById('grammarwise-translated-text').textContent;
  navigator.clipboard.writeText(translatedText).then(() => {
    const btn = document.getElementById('grammarwise-translate-copy');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('GrammarWise: Failed to copy translation:', err);
    showTranslateError('Failed to copy to clipboard');
  });
}

function replaceWithTranslation() {
  const translatedText = document.getElementById('grammarwise-translated-text').textContent;
  console.log('GrammarWise: Attempting to replace with translation');

  // Use the same replace logic as grammar correction
  let replaced = false;

  // Try using stored originalElement
  if (originalElement && document.body.contains(originalElement)) {
    try {
      originalElement.focus();
    } catch (e) {
      console.log('GrammarWise: Could not focus original element');
    }

    if (originalElement.tagName === 'TEXTAREA' || originalElement.tagName === 'INPUT') {
      try {
        const start = originalElement.selectionStart;
        const end = originalElement.selectionEnd;
        const text = originalElement.value;

        originalElement.value = text.substring(0, start) + translatedText + text.substring(end);
        originalElement.selectionStart = originalElement.selectionEnd = start + translatedText.length;

        originalElement.dispatchEvent(new Event('input', { bubbles: true }));
        originalElement.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('GrammarWise: Successfully replaced with translation');
        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
        console.error('GrammarWise: Error replacing with translation:', e);
      }
    }

    if (originalElement.isContentEditable) {
      try {
        if (selectionRange) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(selectionRange);
        }
        const success = document.execCommand('insertText', false, translatedText);
        if (success) {
          console.log('GrammarWise: Successfully replaced with translation in contentEditable');
          replaced = true;
          hideGrammarPanel();
          return;
        }
      } catch (e) {
        console.error('GrammarWise: Error with execCommand for translation:', e);
      }
    }
  }

  // Google Docs specific handling
  if (!replaced && isGoogleDocs) {
    console.log('GrammarWise: Trying Google Docs specific handling for translation');
    try {
      navigator.clipboard.writeText(translatedText).then(() => {
        console.log('GrammarWise: Translation copied, attempting to paste in Google Docs');

        if (selectionRange) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(selectionRange);
        }

        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer()
        });
        pasteEvent.clipboardData.setData('text/plain', translatedText);

        const editor = document.querySelector('.kix-canvas-tile-content, [contenteditable="true"]');
        if (editor) {
          editor.dispatchEvent(pasteEvent);
          console.log('GrammarWise: Translation paste event dispatched to Google Docs');
          replaced = true;
          hideGrammarPanel();
          return;
        }
      }).catch(err => {
        console.error('GrammarWise: Clipboard error for translation:', err);
      });
    } catch (e) {
      console.error('GrammarWise: Google Docs translation paste error:', e);
    }
  }

  // Fallback to clipboard
  if (!replaced) {
    console.log('GrammarWise: Replace failed, copying translation to clipboard');
    copyTranslation();

    if (isGoogleDocs) {
      showTranslateError('Translation copied! Press Ctrl+V (or Cmd+V) to paste in Google Docs.');
    } else {
      showTranslateError('Text copied to clipboard. Paste it manually in the desired location.');
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
