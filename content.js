// Content script for GrammarWise
let floatingButton = null;
let grammarPanel = null;
let selectedText = '';
let selectionRange = null;

console.log('GrammarWise: Content script loaded successfully');

// Listen for messages from background script (for context menu)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('GrammarWise: Received message:', request);
  if (request.action === 'openPanelWithText' && request.text) {
    selectedText = request.text;
    // Get the current selection position or use center of screen
    const selection = window.getSelection();
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (selection && selection.rangeCount > 0) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        x = rect.left + window.scrollX;
        y = rect.bottom + window.scrollY;
        selectionRange = range;
      } catch (e) {
        console.log('GrammarWise: Could not get selection rect, using center');
      }
    }

    showGrammarPanel(x, y);
  }
});

// Listen for text selection
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('selectionchange', handleSelectionChange);

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

  if (text.length > 0) {
    console.log('GrammarWise: Text selected:', text.substring(0, 50) + '...');
    selectedText = text;
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
    background: #6366f1 !important;
    color: white !important;
    border-radius: 50% !important;
    width: 50px !important;
    height: 50px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    box-shadow: 0 6px 30px rgba(255, 0, 0, 0.8) !important;
    border: 4px solid #ff0000 !important;
    pointer-events: auto !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
  `;

  floatingButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;">
      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5V5Z" stroke="currentColor" stroke-width="2"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  floatingButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('GrammarWise: Button clicked');
    const rect = floatingButton.getBoundingClientRect();
    showGrammarPanel(rect.left + window.scrollX, rect.top + window.scrollY);
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

function showGrammarPanel(x, y) {
  console.log('GrammarWise: Showing panel at', x, y);
  hideGrammarPanel();
  hideFloatingButton();

  grammarPanel = document.createElement('div');
  grammarPanel.id = 'grammarwise-panel';
  grammarPanel.innerHTML = `
    <div class="grammarwise-header">
      <h3>GrammarWise</h3>
      <button id="grammarwise-close" class="grammarwise-close-btn">&times;</button>
    </div>
    <div class="grammarwise-content">
      <div class="grammarwise-controls">
        <label for="grammarwise-tone">Tone:</label>
        <select id="grammarwise-tone" class="grammarwise-select">
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
          <option value="concise">Concise</option>
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
  `;

  // Position panel with better viewport handling
  const panelWidth = 400;
  const padding = 20;

  // Calculate available space
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Convert x, y to viewport coordinates if needed
  let panelX = x - window.scrollX;
  let panelY = y - window.scrollY;

  // Position panel to the right of cursor, or left if not enough space
  if (panelX + panelWidth + padding > viewportWidth) {
    // Not enough space on right, position to the left
    panelX = Math.max(padding, panelX - panelWidth - 20);
  } else {
    panelX = Math.min(panelX + 20, viewportWidth - panelWidth - padding);
  }

  // Calculate max height (leave space at bottom for buttons)
  const maxHeight = viewportHeight - padding * 2;
  const spaceBelow = viewportHeight - panelY - 40;
  const spaceAbove = panelY - padding;

  // Position below cursor if enough space, otherwise above
  if (spaceBelow < 200 && spaceAbove > spaceBelow) {
    // Not enough space below, position above
    panelY = Math.max(padding, panelY - Math.min(maxHeight, 400));
  } else {
    // Position below
    panelY = Math.min(panelY + 40, viewportHeight - 200);
  }

  // Ensure panel stays within viewport
  panelX = Math.max(padding, Math.min(panelX, viewportWidth - panelWidth - padding));
  panelY = Math.max(padding, Math.min(panelY, viewportHeight - 200));

  // Apply positioning with fixed position and max-height
  grammarPanel.style.cssText = `
    position: fixed !important;
    left: ${panelX}px !important;
    top: ${panelY}px !important;
    max-height: ${maxHeight}px !important;
    overflow-y: auto !important;
  `;

  document.body.appendChild(grammarPanel);
  console.log('GrammarWise: Panel added to DOM at viewport coords', panelX, panelY);

  // Load default tone from settings
  chrome.storage.sync.get(['defaultTone'], (result) => {
    if (result.defaultTone) {
      document.getElementById('grammarwise-tone').value = result.defaultTone;
    }
  });

  // Add event listeners
  document.getElementById('grammarwise-close').addEventListener('click', hideGrammarPanel);
  document.getElementById('grammarwise-check').addEventListener('click', checkGrammar);

  const copyBtn = document.getElementById('grammarwise-copy');
  const replaceBtn = document.getElementById('grammarwise-replace');

  if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
  if (replaceBtn) replaceBtn.addEventListener('click', replaceText);

  // Click outside to close (with small delay to prevent immediate closing)
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 100);
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
  }
}

async function checkGrammar() {
  console.log('GrammarWise: Checking grammar...');
  const tone = document.getElementById('grammarwise-tone').value;
  const loadingDiv = document.getElementById('grammarwise-loading');
  const resultDiv = document.getElementById('grammarwise-result');
  const errorDiv = document.getElementById('grammarwise-error');

  // Show loading
  loadingDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  errorDiv.style.display = 'none';

  try {
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'checkGrammar',
      text: selectedText,
      tone: tone
    });

    console.log('GrammarWise: Received response:', response);
    loadingDiv.style.display = 'none';

    if (response.success) {
      document.getElementById('grammarwise-corrected-text').textContent = response.correctedText;
      resultDiv.style.display = 'block';
    } else {
      showError(response.error || 'Failed to check grammar');
    }
  } catch (error) {
    console.error('GrammarWise: Error during grammar check:', error);
    loadingDiv.style.display = 'none';
    showError(error.message || 'An error occurred');
  }
}

function showError(message) {
  const errorDiv = document.getElementById('grammarwise-error');
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

  if (selectionRange) {
    // Try to replace the text in the original location
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionRange);

    // Check if we're in an editable element
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.isContentEditable ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'INPUT')) {

      if (activeElement.isContentEditable) {
        document.execCommand('insertText', false, correctedText);
      } else {
        // For textarea and input
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const text = activeElement.value;
        activeElement.value = text.substring(0, start) + correctedText + text.substring(end);
        activeElement.selectionStart = activeElement.selectionEnd = start + correctedText.length;
      }

      hideGrammarPanel();
    } else {
      // If not in editable element, just copy to clipboard
      copyToClipboard();
      showError('Text copied to clipboard. Paste it manually in the desired location.');
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
