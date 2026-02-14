// Options page script for GrammarPeace

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadDictionary();
  document.getElementById('apiProvider').addEventListener('change', handleProviderChange);
  document.getElementById('addWordBtn').addEventListener('click', handleAddWord);
  document.getElementById('newDictWord').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddWord();
    }
  });
});
document.getElementById('settingsForm').addEventListener('submit', saveSettings);
document.getElementById('testBtn').addEventListener('click', testAPI);

function loadSettings() {
  chrome.storage.sync.get(['apiProvider', 'claudeApiKey', 'openaiApiKey', 'openrouterApiKey', 'maxTokens', 'theme', 'defaultGrammarLang', 'defaultTone', 'defaultFromLang', 'defaultToLang'], (result) => {
    // Set provider (default to openrouter if not set)
    const provider = result.apiProvider || 'openrouter';
    document.getElementById('apiProvider').value = provider;

    // Load API keys
    if (result.claudeApiKey) {
      document.getElementById('claudeApiKey').value = result.claudeApiKey;
    }
    if (result.openaiApiKey) {
      document.getElementById('openaiApiKey').value = result.openaiApiKey;
    }
    if (result.openrouterApiKey) {
      document.getElementById('openrouterApiKey').value = result.openrouterApiKey;
    }

    // Load max tokens (default to 1024)
    // If stored value doesn't match dropdown options, use closest valid option
    const storedMaxTokens = result.maxTokens || 1024;
    const validOptions = [512, 1024, 2048, 4096, 8192, 16384];
    let maxTokens = validOptions.includes(storedMaxTokens)
      ? storedMaxTokens
      : validOptions.reduce((prev, curr) =>
          Math.abs(curr - storedMaxTokens) < Math.abs(prev - storedMaxTokens) ? curr : prev
        );
    document.getElementById('maxTokens').value = maxTokens;

    // Load theme preference
    if (result.theme) {
      document.getElementById('theme').value = result.theme;
    }

    // Load preferences
    if (result.defaultGrammarLang) {
      document.getElementById('defaultGrammarLang').value = result.defaultGrammarLang;
    }
    if (result.defaultTone) {
      document.getElementById('defaultTone').value = result.defaultTone;
    }
    if (result.defaultFromLang) {
      document.getElementById('defaultFromLang').value = result.defaultFromLang;
    }
    if (result.defaultToLang) {
      document.getElementById('defaultToLang').value = result.defaultToLang;
    }

    // Show/hide appropriate fields
    handleProviderChange();
  });
}

function handleProviderChange() {
  const provider = document.getElementById('apiProvider').value;

  // Show/hide API key fields
  const claudeKeyGroup = document.getElementById('claudeKeyGroup');
  const openaiKeyGroup = document.getElementById('openaiKeyGroup');
  const openrouterKeyGroup = document.getElementById('openrouterKeyGroup');
  const claudeInfo = document.getElementById('claudeInfo');
  const openaiInfo = document.getElementById('openaiInfo');
  const openrouterInfo = document.getElementById('openrouterInfo');

  // Hide all first
  claudeKeyGroup.style.display = 'none';
  openaiKeyGroup.style.display = 'none';
  openrouterKeyGroup.style.display = 'none';
  claudeInfo.style.display = 'none';
  openaiInfo.style.display = 'none';
  openrouterInfo.style.display = 'none';

  // Show selected provider
  if (provider === 'claude') {
    claudeKeyGroup.style.display = 'block';
    claudeInfo.style.display = 'block';
  } else if (provider === 'openai') {
    openaiKeyGroup.style.display = 'block';
    openaiInfo.style.display = 'block';
  } else if (provider === 'openrouter') {
    openrouterKeyGroup.style.display = 'block';
    openrouterInfo.style.display = 'block';
  }
}

function saveSettings(event) {
  event.preventDefault();

  const provider = document.getElementById('apiProvider').value;
  const claudeApiKey = document.getElementById('claudeApiKey').value.trim();
  const openaiApiKey = document.getElementById('openaiApiKey').value.trim();
  const openrouterApiKey = document.getElementById('openrouterApiKey').value.trim();
  const maxTokens = parseInt(document.getElementById('maxTokens').value);
  const theme = document.getElementById('theme').value;
  const defaultGrammarLang = document.getElementById('defaultGrammarLang').value;
  const defaultTone = document.getElementById('defaultTone').value;
  const defaultFromLang = document.getElementById('defaultFromLang').value;
  const defaultToLang = document.getElementById('defaultToLang').value;

  // Validate based on selected provider
  if (provider === 'claude') {
    if (!claudeApiKey) {
      showStatus('Please enter your Claude API key', 'error');
      return;
    }
    if (!claudeApiKey.startsWith('sk-ant-')) {
      showStatus('Invalid Claude API key format. Key should start with "sk-ant-"', 'error');
      return;
    }
  } else if (provider === 'openai') {
    if (!openaiApiKey) {
      showStatus('Please enter your OpenAI API key', 'error');
      return;
    }
    if (!openaiApiKey.startsWith('sk-')) {
      showStatus('Invalid OpenAI API key format. Key should start with "sk-"', 'error');
      return;
    }
  } else if (provider === 'openrouter') {
    if (!openrouterApiKey) {
      showStatus('Please enter your OpenRouter API key', 'error');
      return;
    }
    if (!openrouterApiKey.startsWith('sk-or-')) {
      showStatus('Invalid OpenRouter API key format. Key should start with "sk-or-"', 'error');
      return;
    }
  }

  // Validate max tokens (dropdown ensures valid values, but double-check)
  const validTokenValues = [512, 1024, 2048, 4096, 8192, 16384];
  if (isNaN(maxTokens) || !validTokenValues.includes(maxTokens)) {
    showStatus('Please select a valid max tokens value', 'error');
    return;
  }

  chrome.storage.sync.set({
    apiProvider: provider,
    claudeApiKey: claudeApiKey,
    openaiApiKey: openaiApiKey,
    openrouterApiKey: openrouterApiKey,
    maxTokens: maxTokens,
    theme: theme,
    defaultGrammarLang: defaultGrammarLang,
    defaultTone: defaultTone,
    defaultFromLang: defaultFromLang,
    defaultToLang: defaultToLang
  }, () => {
    showStatus('Settings saved successfully!', 'success');
  });
}

async function testAPI() {
  const provider = document.getElementById('apiProvider').value;
  const claudeApiKey = document.getElementById('claudeApiKey').value.trim();
  const openaiApiKey = document.getElementById('openaiApiKey').value.trim();
  const openrouterApiKey = document.getElementById('openrouterApiKey').value.trim();

  let apiKey;
  if (provider === 'claude') apiKey = claudeApiKey;
  else if (provider === 'openai') apiKey = openaiApiKey;
  else if (provider === 'openrouter') apiKey = openrouterApiKey;

  if (!apiKey) {
    showStatus('Please enter your API key first', 'error');
    return;
  }

  showStatus('Testing API connection...', 'success');
  document.getElementById('testBtn').disabled = true;

  try {
    if (provider === 'claude') {
      await testClaudeAPI(apiKey);
    } else if (provider === 'openai') {
      await testOpenAIAPI(apiKey);
    } else if (provider === 'openrouter') {
      await testOpenRouterAPI(apiKey);
    }
  } catch (error) {
    showStatus(`API test failed: ${error.message}`, 'error');
  } finally {
    document.getElementById('testBtn').disabled = false;
  }
}

async function testClaudeAPI(apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: 'Say "API test successful" if you can read this.'
      }]
    })
  });

  if (response.ok) {
    showStatus('Claude API test successful! Your key is working.', 'success');
  } else {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `Error ${response.status}`;
    showStatus(`Claude API test failed: ${errorMessage}`, 'error');
  }
}

async function testOpenAIAPI(apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      max_completion_tokens: 50,
      messages: [{
        role: 'user',
        content: 'Say "API test successful" if you can read this.'
      }]
    })
  });

  if (response.ok) {
    showStatus('OpenAI API test successful! Your key is working.', 'success');
  } else {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `Error ${response.status}`;
    showStatus(`OpenAI API test failed: ${errorMessage}`, 'error');
  }
}

async function testOpenRouterAPI(apiKey) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://grammarpeace.com',
      'X-Title': 'GrammarPeace'
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: 'Say "API test successful" if you can read this.'
      }],
      route: 'fallback'
    })
  });

  if (response.ok) {
    showStatus('OpenRouter API test successful! Your key is working.', 'success');
  } else {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `Error ${response.status}`;
    showStatus(`OpenRouter API test failed: ${errorMessage}`, 'error');
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

// Custom Dictionary Functions
async function loadDictionary() {
  const result = await chrome.storage.sync.get(['customDictionary']);
  const dictionary = result.customDictionary || [];
  renderDictionary(dictionary);
}

function renderDictionary(dictionary) {
  const container = document.getElementById('dictionaryWords');

  if (dictionary.length === 0) {
    container.innerHTML = '<p class="empty-dictionary">No custom words added yet.</p>';
    return;
  }

  container.innerHTML = dictionary.map(word => `
    <span class="dictionary-word">
      ${escapeHtml(word)}
      <span class="remove-word" data-word="${escapeHtml(word)}" title="Remove word">&times;</span>
    </span>
  `).join('');

  // Add click handlers for remove buttons
  container.querySelectorAll('.remove-word').forEach(btn => {
    btn.addEventListener('click', () => handleRemoveWord(btn.dataset.word));
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function handleAddWord() {
  const input = document.getElementById('newDictWord');
  const word = input.value.trim();

  if (!word) {
    showStatus('Please enter a word to add', 'error');
    return;
  }

  // Validate word (no spaces, reasonable length)
  if (word.includes(' ')) {
    showStatus('Please enter single words only (no spaces)', 'error');
    return;
  }

  if (word.length > 50) {
    showStatus('Word is too long (max 50 characters)', 'error');
    return;
  }

  const result = await chrome.storage.sync.get(['customDictionary']);
  const dictionary = result.customDictionary || [];

  // Check if word already exists (case-insensitive)
  if (dictionary.some(w => w.toLowerCase() === word.toLowerCase())) {
    showStatus('This word is already in your dictionary', 'error');
    return;
  }

  // Limit dictionary size
  if (dictionary.length >= 100) {
    showStatus('Dictionary is full (max 100 words). Remove some words first.', 'error');
    return;
  }

  dictionary.push(word);
  await chrome.storage.sync.set({ customDictionary: dictionary });

  input.value = '';
  renderDictionary(dictionary);
  showStatus(`"${word}" added to dictionary`, 'success');
}

async function handleRemoveWord(word) {
  const result = await chrome.storage.sync.get(['customDictionary']);
  const dictionary = result.customDictionary || [];

  const updatedDictionary = dictionary.filter(w => w !== word);
  await chrome.storage.sync.set({ customDictionary: updatedDictionary });

  renderDictionary(updatedDictionary);
  showStatus(`"${word}" removed from dictionary`, 'success');
}
