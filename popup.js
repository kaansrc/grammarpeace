// Popup script for GrammarPeace

document.addEventListener('DOMContentLoaded', checkConfiguration);
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('helpBtn').addEventListener('click', openHelp);

function checkConfiguration() {
  chrome.storage.sync.get(['apiProvider', 'claudeApiKey', 'openaiApiKey'], (result) => {
    const statusCard = document.getElementById('statusCard');
    const statusIcon = document.getElementById('statusIcon');
    const statusTitle = document.getElementById('statusTitle');
    const statusDescription = document.getElementById('statusDescription');

    const provider = result.apiProvider || 'claude';
    const apiKey = provider === 'claude' ? result.claudeApiKey : result.openaiApiKey;

    if (apiKey && apiKey.trim()) {
      statusCard.className = 'status-card configured';
      statusIcon.textContent = '✅';
      statusTitle.textContent = 'Ready to use!';
      statusDescription.textContent = 'Your extension is configured and ready. Select text on any webpage to start checking grammar.';
    } else {
      statusCard.className = 'status-card not-configured';
      statusIcon.textContent = '⚠️';
      statusTitle.textContent = 'Setup Required';
      statusDescription.textContent = 'Please configure your Claude API key to start using GrammarPeace. Click "Open Settings" below.';
    }
  });
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

function openHelp() {
  chrome.tabs.create({
    url: 'https://github.com/yourusername/grammarpeace#readme'
  });
}
