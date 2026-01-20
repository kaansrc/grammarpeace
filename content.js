// Content script for GrammarWise
let floatingButton = null;
let grammarPanel = null;
let selectedText = '';
let selectionRange = null;
let originalElement = null; // Store the element that had the selection
let isProcessing = false; // Prevent multiple simultaneous operations
let currentTheme = 'light'; // Track current theme

// Get theme preference (system, light, or dark)
function getThemePreference() {
  return new Promise((resolve) => {
    if (chrome.runtime?.id) {
      chrome.storage.sync.get(['theme'], (result) => {
        if (chrome.runtime.lastError) {
          resolve('system');
          return;
        }
        resolve(result.theme || 'system');
      });
    } else {
      resolve('system');
    }
  });
}

// Determine actual theme based on preference
function resolveTheme(preference) {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

// Apply theme to elements
function applyTheme(theme) {
  currentTheme = theme;
  if (floatingButton) {
    floatingButton.classList.toggle('dark-theme', theme === 'dark');
  }
  if (grammarPanel) {
    grammarPanel.classList.toggle('dark-theme', theme === 'dark');
  }
}

// Initialize theme
async function initTheme() {
  const preference = await getThemePreference();
  const theme = resolveTheme(preference);
  applyTheme(theme);
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
  const preference = await getThemePreference();
  if (preference === 'system') {
    applyTheme(e.matches ? 'dark' : 'light');
  }
});

// Listen for theme changes from settings
if (chrome.runtime?.id) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.theme) {
      const theme = resolveTheme(changes.theme.newValue || 'system');
      applyTheme(theme);
    }
  });
}

// Initialize theme on load
initTheme();

// Detect if we're on Google Docs
const isGoogleDocs = window.location.hostname === 'docs.google.com' && window.location.pathname.includes('/document/');

// GrammarWise content script loaded
if (isGoogleDocs) {
  
  // Show a one-time notification to the user
  if (window === window.top) {
    setTimeout(() => {
      chrome.storage.sync.get(['googleDocsNotificationShown'], (result) => {
        if (!result.googleDocsNotificationShown) {
          chrome.storage.sync.set({ googleDocsNotificationShown: true });
        }
      });
    }, 2000);
  }
}

// Listen for messages from background script (for context menu and keyboard shortcut)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // Handle keyboard shortcut trigger
  if (request.action === 'triggerFromKeyboard') {

    // Try to get selected text
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (!text) {
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

    // Show panel at top center
    showGrammarPanel(0, 0);
    sendResponse({ success: true });
    return true;
  }

  // Handle context menu trigger
  if (request.action === 'openPanelWithText' && request.text) {
    selectedText = request.text;

    // For Google Docs, use a fixed top-center position since selection API doesn't work
    if (isGoogleDocs) {
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

// Listen for keyboard selection (Shift+Arrow keys)
document.addEventListener('keyup', (event) => {
  // Check if Shift key was involved (for text selection)
  if (event.shiftKey || event.key === 'Shift') {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    if (text.length > 0) {
      // Get the selection range for positioning
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          selectedText = text;
          selectionRange = range;
          originalElement = document.activeElement;
          showFloatingButton(rect.right, rect.bottom);
        }
      } catch (e) {
        // Fallback - show at a default position near the active element
        const activeEl = document.activeElement;
        if (activeEl) {
          const rect = activeEl.getBoundingClientRect();
          selectedText = text;
          selectionRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
          originalElement = activeEl;
          showFloatingButton(rect.right, rect.top);
        }
      }
    }
  }
});

// Listen for Ctrl+A / Cmd+A (select all)
document.addEventListener('keydown', (event) => {
  // Check for Ctrl+A (Windows/Linux) or Cmd+A (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
    // Wait a brief moment for the selection to happen
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (text.length > 0) {
        selectedText = text;
        selectionRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        originalElement = document.activeElement;

        // Position button near the active element or center of viewport
        const activeEl = document.activeElement;
        if (activeEl && activeEl !== document.body) {
          const rect = activeEl.getBoundingClientRect();
          showFloatingButton(rect.right, rect.top);
        } else {
          // Fallback to center-right of viewport
          showFloatingButton(window.innerWidth - 60, 100);
        }
      }
    }, 50);
  }
});

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
        // Convert page coordinates to viewport coordinates
        x = event.clientX;
        y = event.clientY;
      }

      showFloatingButton(x, y);
    } catch (e) {
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

  // Apply current theme
  if (currentTheme === 'dark') {
    floatingButton.classList.add('dark-theme');
  }

  floatingButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = floatingButton.getBoundingClientRect();
    await showGrammarPanel(rect.left + window.scrollX, rect.top + window.scrollY);
  });

  document.body.appendChild(floatingButton);

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
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
          continue;
        }
        return null;
      }

      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {

      if (attempt < maxRetries) {
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      } else {
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

// Helper function to calculate character and word counts
function getTextStats(text) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { chars, words };
}

// Calculate detailed writing statistics
function getWritingStatistics(text) {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  const wordCount = words.length;
  const sentenceCount = sentences.length || 1;
  const paragraphCount = paragraphs.length || 1;
  const charCount = text.length;
  const charCountNoSpaces = text.replace(/\s/g, '').length;

  // Calculate syllables (simple approximation)
  const syllableCount = words.reduce((total, word) => {
    return total + countSyllables(word);
  }, 0);

  // Average word length
  const avgWordLength = charCountNoSpaces / wordCount;

  // Average sentence length
  const avgSentenceLength = wordCount / sentenceCount;

  // Flesch Reading Ease Score
  // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * (syllableCount / wordCount));
  const fleschScoreClamped = Math.max(0, Math.min(100, Math.round(fleschScore)));

  // Reading time (avg 200 words per minute)
  const readingTimeMinutes = wordCount / 200;
  const readingTimeSeconds = Math.round(readingTimeMinutes * 60);

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    charCount,
    charCountNoSpaces,
    avgWordLength: avgWordLength.toFixed(1),
    avgSentenceLength: avgSentenceLength.toFixed(1),
    fleschScore: fleschScoreClamped,
    fleschLabel: getFleschLabel(fleschScoreClamped),
    readingTime: formatReadingTime(readingTimeSeconds)
  };
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function getFleschLabel(score) {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

function formatReadingTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function renderWritingStats(text) {
  const stats = getWritingStatistics(text);
  if (!stats) {
    return '<p class="grammarwise-stats-empty">No text to analyze</p>';
  }

  return `
    <div class="grammarwise-stats-grid">
      <div class="grammarwise-stat-item">
        <span class="grammarwise-stat-value">${stats.wordCount}</span>
        <span class="grammarwise-stat-label">Words</span>
      </div>
      <div class="grammarwise-stat-item">
        <span class="grammarwise-stat-value">${stats.sentenceCount}</span>
        <span class="grammarwise-stat-label">Sentences</span>
      </div>
      <div class="grammarwise-stat-item">
        <span class="grammarwise-stat-value">${stats.paragraphCount}</span>
        <span class="grammarwise-stat-label">Paragraphs</span>
      </div>
      <div class="grammarwise-stat-item">
        <span class="grammarwise-stat-value">${stats.readingTime}</span>
        <span class="grammarwise-stat-label">Read time</span>
      </div>
    </div>
    <div class="grammarwise-stats-detail">
      <div class="grammarwise-stat-row">
        <span>Avg. word length:</span>
        <span>${stats.avgWordLength} chars</span>
      </div>
      <div class="grammarwise-stat-row">
        <span>Avg. sentence length:</span>
        <span>${stats.avgSentenceLength} words</span>
      </div>
      <div class="grammarwise-stat-row">
        <span>Readability (Flesch):</span>
        <span>${stats.fleschScore} - ${stats.fleschLabel}</span>
      </div>
    </div>
  `;
}

// Word-level diff algorithm
function computeWordDiff(original, corrected) {
  const originalWords = original.split(/(\s+)/);
  const correctedWords = corrected.split(/(\s+)/);

  // Simple LCS-based diff
  const m = originalWords.length;
  const n = correctedWords.length;

  // Build LCS table
  const lcs = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalWords[i - 1] === correctedWords[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalWords[i - 1] === correctedWords[j - 1]) {
      result.unshift({ type: 'equal', text: originalWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      result.unshift({ type: 'add', text: correctedWords[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'remove', text: originalWords[i - 1] });
      i--;
    }
  }

  return result;
}

// Generate HTML for diff view
function generateDiffHtml(original, corrected) {
  const diff = computeWordDiff(original, corrected);
  let html = '';
  for (const part of diff) {
    if (part.type === 'equal') {
      html += escapeHtml(part.text);
    } else if (part.type === 'add') {
      html += `<span class="gw-diff-add">${escapeHtml(part.text)}</span>`;
    } else if (part.type === 'remove') {
      html += `<span class="gw-diff-remove">${escapeHtml(part.text)}</span>`;
    }
  }
  return html;
}

// Track diff view state
let showDiffView = false;
let lastCorrectedText = ''; // Store for diff toggle

// History management
const MAX_HISTORY_ITEMS = 10;

// Custom Dictionary management
async function getCustomDictionary() {
  if (!chrome.runtime?.id) return [];

  try {
    const data = await new Promise(resolve => {
      chrome.storage.sync.get(['customDictionary'], resolve);
    });
    return data.customDictionary || [];
  } catch (e) {
    return [];
  }
}

async function addToDictionary(word) {
  if (!chrome.runtime?.id || !word) return false;

  try {
    const dictionary = await getCustomDictionary();
    const normalizedWord = word.toLowerCase().trim();

    if (dictionary.includes(normalizedWord)) {
      return false; // Already exists
    }

    dictionary.push(normalizedWord);
    await chrome.storage.sync.set({ customDictionary: dictionary });
    return true;
  } catch (e) {
    return false;
  }
}

async function removeFromDictionary(word) {
  if (!chrome.runtime?.id || !word) return false;

  try {
    const dictionary = await getCustomDictionary();
    const normalizedWord = word.toLowerCase().trim();
    const filtered = dictionary.filter(w => w !== normalizedWord);
    await chrome.storage.sync.set({ customDictionary: filtered });
    return true;
  } catch (e) {
    return false;
  }
}

// Presets management
async function getPresets() {
  if (!chrome.runtime?.id) return [];

  try {
    const data = await new Promise(resolve => {
      chrome.storage.sync.get(['presets'], resolve);
    });
    return data.presets || [];
  } catch (e) {
    return [];
  }
}

async function savePreset(name, settings) {
  if (!chrome.runtime?.id) return;

  try {
    const presets = await getPresets();
    const newPreset = {
      id: Date.now(),
      name: name,
      ...settings
    };

    presets.push(newPreset);
    await chrome.storage.sync.set({ presets });
    return newPreset;
  } catch (e) {
    return null;
  }
}

async function deletePreset(id) {
  if (!chrome.runtime?.id) return;

  try {
    const presets = await getPresets();
    const filtered = presets.filter(p => p.id !== id);
    await chrome.storage.sync.set({ presets: filtered });
  } catch (e) {
    // Silently fail
  }
}

// Load presets into dropdown
async function loadPresetsDropdown() {
  const presetSelect = document.getElementById('grammarwise-preset');
  if (!presetSelect) return;

  const presets = await getPresets();

  // Clear existing options except the first one
  presetSelect.innerHTML = '<option value="">Presets...</option>';

  for (const preset of presets) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name;
    presetSelect.appendChild(option);
  }
}

// Apply selected preset
function applyPreset() {
  const presetSelect = document.getElementById('grammarwise-preset');
  if (!presetSelect || !presetSelect.value) return;

  getPresets().then(presets => {
    const preset = presets.find(p => p.id === parseInt(presetSelect.value));
    if (!preset) return;

    // Apply language setting
    if (preset.language) {
      const langSelect = document.getElementById('grammarwise-language');
      if (langSelect) langSelect.value = preset.language;
    }

    // Apply tone setting if on tone tab
    if (preset.tone) {
      const toneSelect = document.getElementById('grammarwise-tone');
      if (toneSelect) toneSelect.value = preset.tone;
    }

    // Reset dropdown
    presetSelect.value = '';
  });
}

// Handle detect tone button
async function handleDetectTone() {
  const detectBtn = document.getElementById('grammarwise-detect-tone');
  const toneSelect = document.getElementById('grammarwise-tone');
  const detectedDiv = document.getElementById('grammarwise-detected-tone');
  const detectedValue = document.getElementById('grammarwise-detected-tone-value');

  if (!detectBtn || !toneSelect) return;

  // Show loading state
  const originalText = detectBtn.textContent;
  detectBtn.textContent = '...';
  detectBtn.disabled = true;

  try {
    const response = await sendMessageWithRetry({
      action: 'detectTone',
      text: selectedText
    });

    if (response && response.success) {
      // Set the detected tone
      toneSelect.value = response.tone;

      // Show detected tone badge
      if (detectedDiv && detectedValue) {
        const toneLabels = {
          professional: 'Professional',
          casual: 'Casual',
          friendly: 'Friendly',
          formal: 'Formal',
          concise: 'Concise'
        };
        detectedValue.textContent = toneLabels[response.tone] || response.tone;
        detectedDiv.style.display = 'block';
      }

      detectBtn.textContent = '✓';
    } else {
      detectBtn.textContent = '!';
    }
  } catch (e) {
    detectBtn.textContent = '!';
  } finally {
    detectBtn.disabled = false;
    setTimeout(() => {
      detectBtn.textContent = originalText;
    }, 1500);
  }
}

// Handle save preset button
async function handleSavePreset() {
  const langSelect = document.getElementById('grammarwise-language');
  const toneSelect = document.getElementById('grammarwise-tone');

  const language = langSelect ? langSelect.value : 'auto';
  const tone = toneSelect ? toneSelect.value : 'professional';

  const languageNames = {
    auto: 'Auto', en: 'EN', es: 'ES', fr: 'FR', de: 'DE', it: 'IT',
    pt: 'PT', ru: 'RU', ja: 'JA', ko: 'KO', zh: 'ZH', ar: 'AR',
    hi: 'HI', tr: 'TR', nl: 'NL', pl: 'PL'
  };

  const toneNames = {
    professional: 'Pro', casual: 'Casual', friendly: 'Friendly',
    formal: 'Formal', concise: 'Concise', clear: 'Clear'
  };

  const name = `${languageNames[language] || language} - ${toneNames[tone] || tone}`;

  const preset = await savePreset(name, { language, tone });
  if (preset) {
    loadPresetsDropdown();

    // Brief visual feedback
    const btn = document.getElementById('grammarwise-save-preset');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = original; }, 1000);
    }
  }
}

// New preset handling for More tab
async function handleSavePresetNew() {
  const langSelect = document.getElementById('grammarwise-preset-lang');
  const toneSelect = document.getElementById('grammarwise-preset-tone');

  const language = langSelect ? langSelect.value : 'auto';
  const tone = toneSelect ? toneSelect.value : 'professional';

  const languageNames = {
    auto: 'Auto-detect', en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
    pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic',
    hi: 'Hindi', tr: 'Turkish', nl: 'Dutch', pl: 'Polish'
  };

  const toneNames = {
    professional: 'Professional', casual: 'Casual', friendly: 'Friendly',
    formal: 'Formal', concise: 'Concise'
  };

  const name = `${languageNames[language]} + ${toneNames[tone]}`;

  const preset = await savePreset(name, { language, tone });
  if (preset) {
    renderPresetsList();

    // Brief visual feedback
    const btn = document.getElementById('grammarwise-save-preset');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Saved!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    }
  }
}

async function renderPresetsList() {
  const listContainer = document.getElementById('grammarwise-presets-list');
  if (!listContainer) return;

  const presets = await getPresets();

  if (presets.length === 0) {
    listContainer.innerHTML = '<p class="grammarwise-presets-empty">No presets saved yet</p>';
    return;
  }

  const languageNames = {
    auto: 'Auto', en: 'EN', es: 'ES', fr: 'FR', de: 'DE', it: 'IT',
    pt: 'PT', ru: 'RU', ja: 'JA', ko: 'KO', zh: 'ZH', ar: 'AR',
    hi: 'HI', tr: 'TR', nl: 'NL', pl: 'PL'
  };

  const toneNames = {
    professional: 'Pro', casual: 'Casual', friendly: 'Friendly',
    formal: 'Formal', concise: 'Concise'
  };

  let html = '';
  for (const preset of presets) {
    const langLabel = languageNames[preset.language] || preset.language;
    const toneLabel = toneNames[preset.tone] || preset.tone;
    html += `
      <div class="grammarwise-preset-item" data-id="${preset.id}">
        <div class="grammarwise-preset-info">
          <span class="grammarwise-preset-lang">${langLabel}</span>
          <span class="grammarwise-preset-tone">${toneLabel}</span>
        </div>
        <div class="grammarwise-preset-actions">
          <button class="grammarwise-btn-small grammarwise-preset-apply" data-id="${preset.id}" title="Apply this preset">Apply</button>
          <button class="grammarwise-btn-small grammarwise-preset-delete" data-id="${preset.id}" title="Delete this preset">×</button>
        </div>
      </div>
    `;
  }

  listContainer.innerHTML = html;

  // Add event listeners for apply buttons
  listContainer.querySelectorAll('.grammarwise-preset-apply').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      const presets = await getPresets();
      const preset = presets.find(p => p.id === id);
      if (preset) {
        // Apply to main language selector
        const langSelect = document.getElementById('grammarwise-language');
        if (langSelect && preset.language) {
          langSelect.value = preset.language;
        }
        // Apply to tone selector
        const toneSelect = document.getElementById('grammarwise-tone');
        if (toneSelect && preset.tone) {
          toneSelect.value = preset.tone;
        }
        // Visual feedback
        btn.textContent = 'Applied!';
        setTimeout(() => { btn.textContent = 'Apply'; }, 1000);
      }
    });
  });

  // Add event listeners for delete buttons
  listContainer.querySelectorAll('.grammarwise-preset-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      await deletePreset(id);
      renderPresetsList();
    });
  });
}

async function saveToHistory(original, result, actionType) {
  if (!chrome.runtime?.id) return;

  try {
    const data = await new Promise(resolve => {
      chrome.storage.local.get(['history'], resolve);
    });

    const history = data.history || [];
    const newItem = {
      id: Date.now(),
      original: original.substring(0, 500), // Limit size
      result: result.substring(0, 500),
      actionType: actionType, // 'grammar', 'improve', 'tone', 'translate'
      timestamp: new Date().toISOString()
    };

    history.unshift(newItem);
    if (history.length > MAX_HISTORY_ITEMS) {
      history.pop();
    }

    await chrome.storage.local.set({ history });
  } catch (e) {
    // Silently fail
  }
}

async function getHistory() {
  if (!chrome.runtime?.id) return [];

  try {
    const data = await new Promise(resolve => {
      chrome.storage.local.get(['history'], resolve);
    });
    return data.history || [];
  } catch (e) {
    return [];
  }
}

async function clearHistory() {
  if (!chrome.runtime?.id) return;

  try {
    await chrome.storage.local.set({ history: [] });
  } catch (e) {
    // Silently fail
  }
}

// Render history list in the panel
async function renderHistoryList() {
  const historyList = document.getElementById('grammarwise-history-list');
  if (!historyList) return;

  const history = await getHistory();

  if (history.length === 0) {
    historyList.innerHTML = '<p class="grammarwise-history-empty">No history yet</p>';
    return;
  }

  const actionLabels = {
    grammar: 'Grammar',
    improve: 'Improve',
    tone: 'Tone',
    translate: 'Translate'
  };

  let html = '';
  for (const item of history) {
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    html += `
      <div class="grammarwise-history-item" data-id="${item.id}">
        <div class="grammarwise-history-meta">
          <span class="grammarwise-history-type">${actionLabels[item.actionType] || item.actionType}</span>
          <span class="grammarwise-history-time">${dateStr} ${timeStr}</span>
        </div>
        <div class="grammarwise-history-original">${escapeHtml(item.original.substring(0, 100))}${item.original.length > 100 ? '...' : ''}</div>
        <div class="grammarwise-history-result">${escapeHtml(item.result.substring(0, 100))}${item.result.length > 100 ? '...' : ''}</div>
        <button class="grammarwise-btn-small grammarwise-history-use" data-result="${escapeHtml(item.result)}">Use</button>
      </div>
    `;
  }

  historyList.innerHTML = html;

  // Add click handlers for "Use" buttons
  historyList.querySelectorAll('.grammarwise-history-use').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const result = e.target.getAttribute('data-result');
      navigator.clipboard.writeText(result).then(() => {
        e.target.textContent = 'Copied!';
        setTimeout(() => {
          e.target.textContent = 'Use';
        }, 1500);
      });
    });
  });
}

// Toggle diff view
function toggleDiffView() {
  showDiffView = !showDiffView;
  const correctedTextDiv = document.getElementById('grammarwise-corrected-text');
  const diffToggleBtn = document.getElementById('grammarwise-diff-toggle');

  if (!correctedTextDiv || !lastCorrectedText) return;

  if (showDiffView) {
    correctedTextDiv.innerHTML = generateDiffHtml(selectedText, lastCorrectedText);
    if (diffToggleBtn) {
      diffToggleBtn.classList.add('active');
      diffToggleBtn.textContent = 'Plain';
    }
  } else {
    correctedTextDiv.textContent = lastCorrectedText;
    if (diffToggleBtn) {
      diffToggleBtn.classList.remove('active');
      diffToggleBtn.textContent = 'Diff';
    }
  }
}

async function showGrammarPanel(x, y) {

  // Validate extension context before showing panel
  const isValid = await validateExtensionContext();
  if (!isValid) {
    alert('GrammarWise: Extension was reloaded.\n\nPlease refresh this page (F5) to continue using the extension.');
    return;
  }

  hideGrammarPanel();
  hideFloatingButton();

  // Calculate initial stats
  const stats = getTextStats(selectedText);

  grammarPanel = document.createElement('div');
  grammarPanel.id = 'grammarwise-panel';
  grammarPanel.innerHTML = `
    <div class="grammarwise-header">
      <div class="grammarwise-header-left">
        <h3>GrammarWise</h3>
        <span class="grammarwise-stats">${stats.words} words, ${stats.chars} chars</span>
      </div>
      <button id="grammarwise-close" class="grammarwise-close-btn">&times;</button>
    </div>
    <div class="grammarwise-tabs">
      <button class="grammarwise-tab active" data-tab="grammar">Grammar</button>
      <button class="grammarwise-tab" data-tab="tone">Tone</button>
      <button class="grammarwise-tab" data-tab="translate">Translate</button>
      <button class="grammarwise-tab" data-tab="history">History</button>
      <button class="grammarwise-tab" data-tab="more">More</button>
    </div>
    <div class="grammarwise-content">
      <!-- Grammar Tab -->
      <div id="grammarwise-tab-grammar" class="grammarwise-tab-content active">
        <div class="grammarwise-controls">
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
          <button id="grammarwise-check" class="grammarwise-btn-primary">Check</button>
          <button id="grammarwise-improve" class="grammarwise-btn">Improve</button>
        </div>
        <div class="grammarwise-original">
          <strong>Original:</strong>
          <div class="grammarwise-text">${escapeHtml(selectedText)}</div>
        </div>
        <div id="grammarwise-result" class="grammarwise-result" style="display: none;">
          <div class="grammarwise-result-header">
            <strong>Corrected:</strong>
            <div class="grammarwise-result-header-buttons">
              <button id="grammarwise-diff-toggle" class="grammarwise-btn-small" title="Toggle diff view">Diff</button>
              <button id="grammarwise-explain" class="grammarwise-btn-small" title="Explain the corrections">Explain</button>
            </div>
          </div>
          <div id="grammarwise-corrected-text" class="grammarwise-text"></div>
          <div id="grammarwise-explanation-section" class="grammarwise-explanation-section" style="display: none;">
            <div class="grammarwise-explanation-header">
              <strong>Explanation:</strong>
              <button id="grammarwise-close-explanation" class="grammarwise-btn-small" title="Close explanation">Close</button>
            </div>
            <div id="grammarwise-explanation-loading" class="grammarwise-explanation-loading" style="display: none;">
              <span class="grammarwise-mini-spinner"></span> Analyzing corrections...
            </div>
            <div id="grammarwise-explanation-content" class="grammarwise-explanation-content"></div>
          </div>
          <div id="grammarwise-alternatives-section" class="grammarwise-alternatives-section" style="display: none;">
            <div class="grammarwise-alternatives-header">
              <strong>Alternatives:</strong>
              <button id="grammarwise-get-alternatives" class="grammarwise-btn-small" title="Get alternative suggestions">Get More</button>
            </div>
            <div id="grammarwise-alternatives-loading" class="grammarwise-alternatives-loading" style="display: none;">
              <span class="grammarwise-mini-spinner"></span> Loading alternatives...
            </div>
            <div id="grammarwise-alternatives-list" class="grammarwise-alternatives-list"></div>
          </div>
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
        <div class="grammarwise-tone-detected" id="grammarwise-detected-tone" style="display: none;">
          <span>Detected: </span><strong id="grammarwise-detected-tone-value"></strong>
        </div>
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
          <button id="grammarwise-detect-tone" class="grammarwise-btn-small" title="Auto-detect tone">Detect</button>
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

      <!-- History Tab -->
      <div id="grammarwise-tab-history" class="grammarwise-tab-content" style="display: none;">
        <div class="grammarwise-history-header">
          <span>Recent corrections</span>
          <button id="grammarwise-clear-history" class="grammarwise-btn-small">Clear</button>
        </div>
        <div id="grammarwise-history-list" class="grammarwise-history-list">
          <p class="grammarwise-history-empty">No history yet</p>
        </div>
      </div>

      <!-- More Tab -->
      <div id="grammarwise-tab-more" class="grammarwise-tab-content" style="display: none;">
        <div class="grammarwise-section">
          <div class="grammarwise-section-title">Writing Statistics</div>
          <div id="grammarwise-writing-stats" class="grammarwise-writing-stats">
            ${renderWritingStats(selectedText)}
          </div>
        </div>

        <div class="grammarwise-divider"></div>

        <div class="grammarwise-section">
          <div class="grammarwise-section-title">Quick Presets</div>
          <p class="grammarwise-section-desc">Save your favorite language + tone combinations for quick access.</p>
          <div class="grammarwise-presets-manage">
            <div class="grammarwise-preset-create">
              <select id="grammarwise-preset-lang" class="grammarwise-select">
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
              <select id="grammarwise-preset-tone" class="grammarwise-select">
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
                <option value="concise">Concise</option>
              </select>
              <button id="grammarwise-save-preset" class="grammarwise-btn-small" title="Save as preset">Save</button>
            </div>
            <div id="grammarwise-presets-list" class="grammarwise-presets-list">
              <p class="grammarwise-presets-empty">No presets saved yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Position panel at top center of viewport
  const panelWidth = 450;
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
    width: 450px !important;
    display: flex !important;
    flex-direction: column !important;
  `;

  // Apply current theme
  if (currentTheme === 'dark') {
    grammarPanel.classList.add('dark-theme');
  }

  document.body.appendChild(grammarPanel);

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
    hideGrammarPanel();
  });

  // Grammar tab event listeners
  document.getElementById('grammarwise-check').addEventListener('click', checkGrammar);
  document.getElementById('grammarwise-improve').addEventListener('click', improveText);

  const copyBtn = document.getElementById('grammarwise-copy');
  const replaceBtn = document.getElementById('grammarwise-replace');
  const diffToggleBtn = document.getElementById('grammarwise-diff-toggle');

  if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
  if (replaceBtn) replaceBtn.addEventListener('click', replaceText);
  if (diffToggleBtn) diffToggleBtn.addEventListener('click', toggleDiffView);

  // Alternatives event listener
  const getAlternativesBtn = document.getElementById('grammarwise-get-alternatives');
  if (getAlternativesBtn) getAlternativesBtn.addEventListener('click', handleGetAlternatives);

  // Explain errors event listeners
  const explainBtn = document.getElementById('grammarwise-explain');
  const closeExplanationBtn = document.getElementById('grammarwise-close-explanation');
  if (explainBtn) explainBtn.addEventListener('click', handleExplainErrors);
  if (closeExplanationBtn) closeExplanationBtn.addEventListener('click', closeExplanation);

  // Presets event listeners (in More tab)
  const savePresetBtn = document.getElementById('grammarwise-save-preset');
  if (savePresetBtn) {
    savePresetBtn.addEventListener('click', handleSavePresetNew);
  }

  // Load presets list when More tab is clicked
  const moreTab = grammarPanel.querySelector('[data-tab="more"]');
  if (moreTab) {
    moreTab.addEventListener('click', () => {
      renderPresetsList();
    });
  }

  // Tone rewrite event listeners
  document.getElementById('grammarwise-rewrite-tone').addEventListener('click', rewriteWithTone);

  const detectToneBtn = document.getElementById('grammarwise-detect-tone');
  if (detectToneBtn) detectToneBtn.addEventListener('click', handleDetectTone);

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

  // History tab event listeners
  const clearHistoryBtn = document.getElementById('grammarwise-clear-history');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async () => {
      await clearHistory();
      renderHistoryList();
    });
  }

  // Load history when history tab is clicked
  const historyTab = grammarPanel.querySelector('[data-tab="history"]');
  if (historyTab) {
    historyTab.addEventListener('click', () => {
      renderHistoryList();
    });
  }

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
    isProcessing = false; // Reset processing flag when panel is closed
  }
}

async function checkGrammar() {
  // Prevent multiple simultaneous operations
  if (isProcessing) {
    return;
  }

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

    loadingDiv.style.display = 'none';

    if (response && response.success) {
      if (response.noChanges) {
        // Show success message when no changes needed
        const resultContent = document.getElementById('grammarwise-corrected-text');
        resultContent.innerHTML = `<div style="color: var(--gw-success-text); font-weight: 500; padding: 12px; background: var(--gw-success-bg); border-radius: 6px; text-align: center;">✓ ${response.message}</div>`;
        // Hide the action buttons and diff toggle since there's nothing to copy/replace
        const actions = resultDiv.querySelector('.grammarwise-actions');
        const diffBtn = document.getElementById('grammarwise-diff-toggle');
        if (actions) actions.style.display = 'none';
        if (diffBtn) diffBtn.style.display = 'none';
        lastCorrectedText = '';
        resultDiv.style.display = 'block';
      } else {
        // Reset diff view state
        showDiffView = false;
        lastCorrectedText = response.correctedText;

        // Show corrected text with action buttons
        document.getElementById('grammarwise-corrected-text').textContent = response.correctedText;
        const actions = resultDiv.querySelector('.grammarwise-actions');
        const diffBtn = document.getElementById('grammarwise-diff-toggle');
        if (actions) actions.style.display = 'flex';
        if (diffBtn) {
          diffBtn.style.display = 'inline-block';
          diffBtn.classList.remove('active');
          diffBtn.textContent = 'Diff';
        }

        // Show alternatives section (reset state)
        const altSection = document.getElementById('grammarwise-alternatives-section');
        const altList = document.getElementById('grammarwise-alternatives-list');
        const altLoading = document.getElementById('grammarwise-alternatives-loading');
        if (altSection) {
          altSection.style.display = 'block';
          if (altList) altList.innerHTML = '';
          if (altLoading) altLoading.style.display = 'none';
        }

        resultDiv.style.display = 'block';

        // Save to history
        saveToHistory(selectedText, response.correctedText, 'grammar');
      }
    } else if (response && response.error) {
      showError(response.error);
    } else {
      showError('Failed to check grammar. Please refresh the page and try again.');
    }
  } catch (error) {
    loadingDiv.style.display = 'none';
    showError(error.message || 'An error occurred');
  } finally {
    isProcessing = false;
  }
}

async function improveText() {
  // Prevent multiple simultaneous operations
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  const loadingDiv = document.getElementById('grammarwise-loading');
  const resultDiv = document.getElementById('grammarwise-result');
  const errorDiv = document.getElementById('grammarwise-error');

  // Show loading
  loadingDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  errorDiv.style.display = 'none';

  // Update loading text
  const loadingText = loadingDiv.querySelector('p');
  if (loadingText) loadingText.textContent = 'Improving text...';

  try {
    // Send message to background script with 'clear' tone for improvement
    const response = await sendMessageWithRetry({
      action: 'rewriteWithTone',
      text: selectedText,
      tone: 'clear'
    });

    loadingDiv.style.display = 'none';

    // Reset loading text
    if (loadingText) loadingText.textContent = 'Checking grammar...';

    if (response && response.success) {
      // Reset diff view state
      showDiffView = false;
      lastCorrectedText = response.rewrittenText;

      // Show improved text with action buttons
      document.getElementById('grammarwise-corrected-text').textContent = response.rewrittenText;
      const actions = resultDiv.querySelector('.grammarwise-actions');
      const diffBtn = document.getElementById('grammarwise-diff-toggle');
      if (actions) actions.style.display = 'flex';
      if (diffBtn) {
        diffBtn.style.display = 'inline-block';
        diffBtn.classList.remove('active');
        diffBtn.textContent = 'Diff';
      }
      resultDiv.style.display = 'block';

      // Update the label to show "Improved:" instead of "Corrected:"
      const strongLabel = resultDiv.querySelector('.grammarwise-result-header strong');
      if (strongLabel) strongLabel.textContent = 'Improved:';

      // Save to history
      saveToHistory(selectedText, response.rewrittenText, 'improve');
    } else if (response && response.error) {
      showError(response.error);
    } else {
      showError('Failed to improve text. Please refresh the page and try again.');
    }
  } catch (error) {
    loadingDiv.style.display = 'none';
    showError(error.message || 'An error occurred');
  } finally {
    isProcessing = false;
  }
}

async function handleGetAlternatives() {
  const altLoading = document.getElementById('grammarwise-alternatives-loading');
  const altList = document.getElementById('grammarwise-alternatives-list');
  const altBtn = document.getElementById('grammarwise-get-alternatives');
  const correctedText = document.getElementById('grammarwise-corrected-text').textContent;
  const language = document.getElementById('grammarwise-language').value;

  if (!correctedText || !selectedText) {
    return;
  }

  // Show loading state
  if (altBtn) altBtn.disabled = true;
  if (altLoading) altLoading.style.display = 'block';
  if (altList) altList.innerHTML = '';

  try {
    const response = await sendMessageWithRetry({
      action: 'getAlternatives',
      text: selectedText,
      correctedText: correctedText,
      language: language
    });

    if (altLoading) altLoading.style.display = 'none';

    if (response && response.success && response.alternatives.length > 0) {
      renderAlternatives(response.alternatives);
    } else if (response && response.error) {
      if (altList) altList.innerHTML = `<div class="grammarwise-alternatives-error">Failed to get alternatives: ${escapeHtml(response.error)}</div>`;
    } else {
      if (altList) altList.innerHTML = '<div class="grammarwise-alternatives-error">No alternatives available.</div>';
    }
  } catch (error) {
    if (altLoading) altLoading.style.display = 'none';
    if (altList) altList.innerHTML = `<div class="grammarwise-alternatives-error">Error: ${escapeHtml(error.message)}</div>`;
  } finally {
    if (altBtn) altBtn.disabled = false;
  }
}

function renderAlternatives(alternatives) {
  const altList = document.getElementById('grammarwise-alternatives-list');
  if (!altList) return;

  altList.innerHTML = alternatives.map((alt, index) => `
    <div class="grammarwise-alternative-item" data-index="${index}">
      <div class="grammarwise-alternative-text">${escapeHtml(alt)}</div>
      <div class="grammarwise-alternative-actions">
        <button class="grammarwise-btn-small grammarwise-alt-use" data-alt="${escapeHtml(alt)}" title="Use this version">Use</button>
        <button class="grammarwise-btn-small grammarwise-alt-copy" data-alt="${escapeHtml(alt)}" title="Copy to clipboard">Copy</button>
      </div>
    </div>
  `).join('');

  // Add event listeners
  altList.querySelectorAll('.grammarwise-alt-use').forEach(btn => {
    btn.addEventListener('click', () => {
      const altText = btn.dataset.alt;
      document.getElementById('grammarwise-corrected-text').textContent = altText;
      lastCorrectedText = altText;
      // Reset diff if active
      showDiffView = false;
      const diffBtn = document.getElementById('grammarwise-diff-toggle');
      if (diffBtn) {
        diffBtn.classList.remove('active');
        diffBtn.textContent = 'Diff';
      }
    });
  });

  altList.querySelectorAll('.grammarwise-alt-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const altText = btn.dataset.alt;
      try {
        await navigator.clipboard.writeText(altText);
        const origText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = origText; }, 1500);
      } catch (err) {
        btn.textContent = 'Failed';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      }
    });
  });
}

async function handleExplainErrors() {
  const explainSection = document.getElementById('grammarwise-explanation-section');
  const explainLoading = document.getElementById('grammarwise-explanation-loading');
  const explainContent = document.getElementById('grammarwise-explanation-content');
  const explainBtn = document.getElementById('grammarwise-explain');
  const correctedText = document.getElementById('grammarwise-corrected-text').textContent;
  const language = document.getElementById('grammarwise-language').value;

  if (!correctedText || !selectedText) {
    return;
  }

  // Show section and loading state
  if (explainSection) explainSection.style.display = 'block';
  if (explainBtn) explainBtn.disabled = true;
  if (explainLoading) explainLoading.style.display = 'block';
  if (explainContent) explainContent.innerHTML = '';

  try {
    const response = await sendMessageWithRetry({
      action: 'explainErrors',
      text: selectedText,
      correctedText: correctedText,
      language: language
    });

    if (explainLoading) explainLoading.style.display = 'none';

    if (response && response.success && response.explanation) {
      // Format the explanation with proper line breaks
      const formatted = formatExplanation(response.explanation);
      if (explainContent) explainContent.innerHTML = formatted;
    } else if (response && response.error) {
      if (explainContent) explainContent.innerHTML = `<div class="grammarwise-explanation-error">${escapeHtml(response.error)}</div>`;
    } else {
      if (explainContent) explainContent.innerHTML = '<div class="grammarwise-explanation-error">Unable to generate explanation.</div>';
    }
  } catch (error) {
    if (explainLoading) explainLoading.style.display = 'none';
    if (explainContent) explainContent.innerHTML = `<div class="grammarwise-explanation-error">${escapeHtml(error.message)}</div>`;
  } finally {
    if (explainBtn) explainBtn.disabled = false;
  }
}

function formatExplanation(text) {
  // Convert bullet points and line breaks to HTML
  const lines = text.split('\n').filter(line => line.trim());
  const formatted = lines.map(line => {
    const trimmed = line.trim();
    // Check if it's a bullet point
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const content = trimmed.replace(/^[•\-\*]\s*/, '');
      return `<div class="grammarwise-explanation-bullet">${escapeHtml(content)}</div>`;
    }
    // Check if it's a numbered item
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const content = trimmed.replace(/^\d+[\.\)]\s*/, '');
      return `<div class="grammarwise-explanation-bullet">${escapeHtml(content)}</div>`;
    }
    return `<div class="grammarwise-explanation-line">${escapeHtml(trimmed)}</div>`;
  });
  return formatted.join('');
}

function closeExplanation() {
  const explainSection = document.getElementById('grammarwise-explanation-section');
  if (explainSection) explainSection.style.display = 'none';
}

async function rewriteWithTone() {
  // Prevent multiple simultaneous operations
  if (isProcessing) {
    return;
  }

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

    loadingDiv.style.display = 'none';

    if (response && response.success) {
      document.getElementById('grammarwise-rewritten-text').textContent = response.rewrittenText;
      resultDiv.style.display = 'block';

      // Save to history
      saveToHistory(selectedText, response.rewrittenText, 'tone');
    } else if (response && response.error) {
      showToneError(response.error);
    } else {
      showToneError('Failed to rewrite with tone. Please refresh the page and try again.');
    }
  } catch (error) {
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
    showError('Failed to copy to clipboard');
  });
}

function replaceText() {
  const correctedText = document.getElementById('grammarwise-corrected-text').textContent;

  // Try multiple strategies to replace text
  let replaced = false;

  // Strategy 1: Use stored originalElement if it's editable
  if (originalElement && document.body.contains(originalElement)) {

    // Focus the element first
    try {
      originalElement.focus();
    } catch (e) {
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

        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
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
          replaced = true;
          hideGrammarPanel();
          return;
        }
      } catch (e) {
      }
    }
  }

  // Strategy 2: Try current activeElement
  if (!replaced) {
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

        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
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
        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
      }
    }
  }

  // Strategy 3: Try using selection range directly
  if (!replaced && selectionRange) {
    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(selectionRange);

      // Try execCommand one more time
      const success = document.execCommand('insertText', false, correctedText);
      if (success) {
        replaced = true;
        hideGrammarPanel();
        return;
      }
    } catch (e) {
    }
  }

  // Strategy 4: Google Docs specific handling
  if (!replaced && isGoogleDocs) {
    try {
      // Copy corrected text to clipboard
      navigator.clipboard.writeText(correctedText).then(() => {

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
          replaced = true;
          hideGrammarPanel();
          return;
        }
      }).catch(err => {
      });
    } catch (e) {
    }
  }

  // If all strategies failed, fallback to clipboard
  if (!replaced) {
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
    showToneError('Failed to copy to clipboard');
  });
}

function replaceToneResult() {
  const rewrittenText = document.getElementById('grammarwise-rewritten-text').textContent;

  // Use the same replacement logic as replaceText
  let replaced = false;

  // Strategy 1: Use stored originalElement if it's editable
  if (originalElement && document.body.contains(originalElement)) {
    try {
      originalElement.focus();
    } catch (e) {
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

        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
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
          replaced = true;
          hideGrammarPanel();
          return;
        }
      } catch (e) {
      }
    }
  }

  // Fallback to clipboard
  if (!replaced) {
    copyToneResult();
    showToneError('Text copied to clipboard. Paste it manually in the desired location.');
  }
}

async function translateText() {
  // Prevent multiple simultaneous operations
  if (isProcessing) {
    return;
  }

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

    loadingDiv.style.display = 'none';

    if (response && response.success) {
      document.getElementById('grammarwise-translated-text').textContent = response.translatedText;
      resultDiv.style.display = 'block';

      // Save to history
      saveToHistory(selectedText, response.translatedText, 'translate');
    } else if (response && response.error) {
      showTranslateError(response.error);
    } else {
      showTranslateError('Failed to translate. Please refresh the page and try again.');
    }
  } catch (error) {
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
    showTranslateError('Failed to copy to clipboard');
  });
}

function replaceWithTranslation() {
  const translatedText = document.getElementById('grammarwise-translated-text').textContent;

  // Use the same replace logic as grammar correction
  let replaced = false;

  // Try using stored originalElement
  if (originalElement && document.body.contains(originalElement)) {
    try {
      originalElement.focus();
    } catch (e) {
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

        replaced = true;
        hideGrammarPanel();
        return;
      } catch (e) {
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
          replaced = true;
          hideGrammarPanel();
          return;
        }
      } catch (e) {
      }
    }
  }

  // Google Docs specific handling
  if (!replaced && isGoogleDocs) {
    try {
      navigator.clipboard.writeText(translatedText).then(() => {

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
          replaced = true;
          hideGrammarPanel();
          return;
        }
      }).catch(err => {
      });
    } catch (e) {
    }
  }

  // Fallback to clipboard
  if (!replaced) {
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
