// Options page script for GrammarWise

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('settingsForm').addEventListener('submit', saveSettings);
document.getElementById('testBtn').addEventListener('click', testAPI);

function loadSettings() {
  chrome.storage.sync.get(['apiKey', 'defaultGrammarLang', 'defaultTone', 'defaultFromLang', 'defaultToLang'], (result) => {
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
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
  });
}

function saveSettings(event) {
  event.preventDefault();

  const apiKey = document.getElementById('apiKey').value.trim();
  const defaultGrammarLang = document.getElementById('defaultGrammarLang').value;
  const defaultTone = document.getElementById('defaultTone').value;
  const defaultFromLang = document.getElementById('defaultFromLang').value;
  const defaultToLang = document.getElementById('defaultToLang').value;

  if (!apiKey) {
    showStatus('Please enter your API key', 'error');
    return;
  }

  // Validate API key format (basic check)
  if (!apiKey.startsWith('sk-ant-')) {
    showStatus('Invalid API key format. Key should start with "sk-ant-"', 'error');
    return;
  }

  chrome.storage.sync.set({
    apiKey: apiKey,
    defaultGrammarLang: defaultGrammarLang,
    defaultTone: defaultTone,
    defaultFromLang: defaultFromLang,
    defaultToLang: defaultToLang
  }, () => {
    showStatus('Settings saved successfully!', 'success');
  });
}

async function testAPI() {
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    showStatus('Please enter your API key first', 'error');
    return;
  }

  showStatus('Testing API connection...', 'success');
  document.getElementById('testBtn').disabled = true;

  try {
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
      showStatus('API test successful! Your key is working.', 'success');
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Error ${response.status}`;
      showStatus(`API test failed: ${errorMessage}`, 'error');
    }
  } catch (error) {
    showStatus(`API test failed: ${error.message}`, 'error');
  } finally {
    document.getElementById('testBtn').disabled = false;
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
