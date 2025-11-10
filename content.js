// Content script for GrammarWise
let floatingButton = null;
let grammarPanel = null;
let selectedText = '';
let selectionRange = null;

// Listen for text selection
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('selectionchange', handleSelectionChange);

function handleSelectionChange() {
  const selection = window.getSelection();
  if (selection.toString().trim().length === 0) {
    hideFloatingButton();
  }
}

function handleTextSelection(event) {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text.length > 0) {
    selectedText = text;
    selectionRange = selection.getRangeAt(0);
    showFloatingButton(event.pageX, event.pageY);
  } else {
    hideFloatingButton();
  }
}

function showFloatingButton(x, y) {
  hideFloatingButton();

  floatingButton = document.createElement('div');
  floatingButton.id = 'grammarwise-floating-button';
  floatingButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5V5Z" stroke="currentColor" stroke-width="2"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // Position the button near the selection
  floatingButton.style.left = `${x + 10}px`;
  floatingButton.style.top = `${y + 10}px`;

  floatingButton.addEventListener('click', (e) => {
    e.stopPropagation();
    showGrammarPanel(x, y);
  });

  document.body.appendChild(floatingButton);
}

function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.remove();
    floatingButton = null;
  }
}

function showGrammarPanel(x, y) {
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

  // Position panel
  grammarPanel.style.left = `${Math.min(x, window.innerWidth - 400)}px`;
  grammarPanel.style.top = `${Math.min(y + 40, window.innerHeight - 300)}px`;

  document.body.appendChild(grammarPanel);

  // Load default tone from settings
  chrome.storage.sync.get(['defaultTone'], (result) => {
    if (result.defaultTone) {
      document.getElementById('grammarwise-tone').value = result.defaultTone;
    }
  });

  // Add event listeners
  document.getElementById('grammarwise-close').addEventListener('click', hideGrammarPanel);
  document.getElementById('grammarwise-check').addEventListener('click', checkGrammar);
  document.getElementById('grammarwise-copy').addEventListener('click', copyToClipboard);
  document.getElementById('grammarwise-replace').addEventListener('click', replaceText);

  // Click outside to close
  document.addEventListener('click', handleOutsideClick);
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

    loadingDiv.style.display = 'none';

    if (response.success) {
      document.getElementById('grammarwise-corrected-text').textContent = response.correctedText;
      resultDiv.style.display = 'block';
    } else {
      showError(response.error || 'Failed to check grammar');
    }
  } catch (error) {
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
