// Content script for GrammarWise
let floatingButton = null;
let grammarPanel = null;
let selectedText = '';
let selectionRange = null;
let originalElement = null; // Store the element that had the selection

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
    <div class="grammarwise-tabs">
      <button class="grammarwise-tab active" data-tab="grammar">Fix Grammar</button>
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

  // Position panel with better viewport handling
  const panelWidth = 400;
  const padding = 20;
  const minHeight = 250; // Minimum height to ensure buttons are visible

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

  // Calculate available space below and above
  const spaceBelow = viewportHeight - panelY - padding;
  const spaceAbove = panelY - padding;

  // Decide positioning strategy - prioritize having enough space for buttons
  if (spaceBelow < minHeight) {
    // Not enough space below, try positioning above
    if (spaceAbove >= minHeight) {
      // Position above the cursor
      const maxHeightAbove = Math.min(spaceAbove, viewportHeight - padding * 2);
      panelY = Math.max(padding, panelY - maxHeightAbove);
    } else {
      // Neither has enough space, position at top of viewport
      panelY = padding;
    }
  } else {
    // Position below cursor
    panelY = Math.min(panelY + 40, viewportHeight - minHeight);
  }

  // Calculate final max height
  const availableHeight = viewportHeight - panelY - padding;
  const maxHeight = Math.max(minHeight, Math.min(availableHeight, viewportHeight - padding * 2));

  // Ensure panel stays within viewport bounds
  panelX = Math.max(padding, Math.min(panelX, viewportWidth - panelWidth - padding));
  panelY = Math.max(padding, Math.min(panelY, viewportHeight - minHeight));

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
  console.log('GrammarWise: Panel added to DOM at viewport coords', panelX, panelY, 'with max-height', maxHeight);

  // Load default settings
  chrome.storage.sync.get(['defaultTone', 'defaultGrammarLang', 'defaultFromLang', 'defaultToLang'], (result) => {
    if (result.defaultGrammarLang) {
      document.getElementById('grammarwise-language').value = result.defaultGrammarLang;
    }
    if (result.defaultTone) {
      document.getElementById('grammarwise-tone').value = result.defaultTone;
    }
    if (result.defaultFromLang) {
      document.getElementById('grammarwise-from-lang').value = result.defaultFromLang;
    }
    if (result.defaultToLang) {
      document.getElementById('grammarwise-to-lang').value = result.defaultToLang;
    }
  });

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
  const language = document.getElementById('grammarwise-language').value;
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
      language: language,
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

  // If all strategies failed, fallback to clipboard
  if (!replaced) {
    console.log('GrammarWise: All replace strategies failed, copying to clipboard');
    copyToClipboard();
    showError('Text copied to clipboard. Paste it manually in the desired location.');
  }
}

async function translateText() {
  console.log('GrammarWise: Translating text...');
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
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'translateText',
      text: selectedText,
      fromLang: fromLang,
      toLang: toLang
    });

    console.log('GrammarWise: Received translation response:', response);
    loadingDiv.style.display = 'none';

    if (response.success) {
      document.getElementById('grammarwise-translated-text').textContent = response.translatedText;
      resultDiv.style.display = 'block';
    } else {
      showTranslateError(response.error || 'Failed to translate');
    }
  } catch (error) {
    console.error('GrammarWise: Error during translation:', error);
    loadingDiv.style.display = 'none';
    showTranslateError(error.message || 'An error occurred');
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

  // Fallback to clipboard
  if (!replaced) {
    console.log('GrammarWise: Replace failed, copying translation to clipboard');
    copyTranslation();
    showTranslateError('Text copied to clipboard. Paste it manually in the desired location.');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
