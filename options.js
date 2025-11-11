// Options page script for GrammarWise

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  document.getElementById('apiProvider').addEventListener('change', handleProviderChange);
});
document.getElementById('settingsForm').addEventListener('submit', saveSettings);
document.getElementById('testBtn').addEventListener('click', testAPI);

function loadSettings() {
  chrome.storage.sync.get(['apiProvider', 'claudeApiKey', 'openaiApiKey', 'defaultGrammarLang', 'defaultTone', 'defaultFromLang', 'defaultToLang'], (result) => {
    // Set provider (default to claude if not set)
    const provider = result.apiProvider || 'claude';
    document.getElementById('apiProvider').value = provider;

    // Load API keys
    if (result.claudeApiKey) {
      document.getElementById('claudeApiKey').value = result.claudeApiKey;
    }
    if (result.openaiApiKey) {
      document.getElementById('openaiApiKey').value = result.openaiApiKey;
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
  const claudeInfo = document.getElementById('claudeInfo');
  const openaiInfo = document.getElementById('openaiInfo');

  if (provider === 'claude') {
    claudeKeyGroup.style.display = 'block';
    openaiKeyGroup.style.display = 'none';
    claudeInfo.style.display = 'block';
    openaiInfo.style.display = 'none';
  } else {
    claudeKeyGroup.style.display = 'none';
    openaiKeyGroup.style.display = 'block';
    claudeInfo.style.display = 'none';
    openaiInfo.style.display = 'block';
  }
}

function saveSettings(event) {
  event.preventDefault();

  const provider = document.getElementById('apiProvider').value;
  const claudeApiKey = document.getElementById('claudeApiKey').value.trim();
  const openaiApiKey = document.getElementById('openaiApiKey').value.trim();
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
  } else {
    if (!openaiApiKey) {
      showStatus('Please enter your OpenAI API key', 'error');
      return;
    }
    if (!openaiApiKey.startsWith('sk-')) {
      showStatus('Invalid OpenAI API key format. Key should start with "sk-"', 'error');
      return;
    }
  }

  chrome.storage.sync.set({
    apiProvider: provider,
    claudeApiKey: claudeApiKey,
    openaiApiKey: openaiApiKey,
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

  const apiKey = provider === 'claude' ? claudeApiKey : openaiApiKey;

  if (!apiKey) {
    showStatus('Please enter your API key first', 'error');
    return;
  }

  showStatus('Testing API connection...', 'success');
  document.getElementById('testBtn').disabled = true;

  try {
    if (provider === 'claude') {
      await testClaudeAPI(apiKey);
    } else {
      await testOpenAIAPI(apiKey);
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
      model: 'gpt-5-nano-2025-08-07',
      max_tokens: 50,
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

function showStatus(message, type) {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = 'block';

  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}
