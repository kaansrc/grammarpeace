// Background service worker for GrammarWise

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'grammarwise-check',
    title: 'Check Grammar with GrammarWise',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'grammarwise-check' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'openPanelWithText',
      text: info.selectionText
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkGrammar') {
    checkGrammarWithClaude(request.text, request.language, request.tone)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'translateText') {
    translateTextWithClaude(request.text, request.fromLang, request.toLang)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

async function checkGrammarWithClaude(text, language, tone) {
  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['apiKey']);

    if (!result.apiKey) {
      return {
        success: false,
        error: 'Please set your Claude API key in the extension settings.'
      };
    }

    // Prepare the prompt based on language and tone
    const prompt = createPrompt(text, language, tone);

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': result.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response from Claude API');
    }

    return {
      success: true,
      correctedText: data.content[0].text.trim()
    };

  } catch (error) {
    console.error('Error checking grammar:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

function createPrompt(text, language, tone) {
  const toneInstructions = {
    professional: 'Make it professional and business-appropriate.',
    casual: 'Make it casual and conversational.',
    friendly: 'Make it friendly and warm.',
    formal: 'Make it formal and academic.',
    concise: 'Make it concise and to the point.'
  };

  const languageNames = {
    auto: 'Auto-detect',
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic',
    hi: 'Hindi',
    tr: 'Turkish',
    nl: 'Dutch',
    pl: 'Polish'
  };

  const toneInstruction = toneInstructions[tone] || toneInstructions.professional;
  const languageName = languageNames[language] || 'Auto-detect';

  let languageInstruction = '';
  if (language === 'auto') {
    languageInstruction = 'Detect the language of the text and fix the grammar, spelling, and punctuation in that language.';
  } else {
    languageInstruction = `Fix the grammar, spelling, and punctuation in ${languageName}.`;
  }

  return `${languageInstruction} ${toneInstruction}

CRITICAL: Return ONLY the corrected text in the same language as the input. Do NOT add any explanations, comments, notes, or phrases like "Here's the corrected version". Do NOT use markdown formatting. Just return the corrected text exactly as it should be written.

IMPORTANT: Do NOT use em dashes (—). Use regular hyphens (-) or commas instead.

If the text seems incomplete or unusual, still return your best correction without any explanation.

Text:
${text}

Corrected text:`;
}

async function translateTextWithClaude(text, fromLang, toLang) {
  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['apiKey']);

    if (!result.apiKey) {
      return {
        success: false,
        error: 'Please set your Claude API key in the extension settings.'
      };
    }

    // Create translation prompt
    const prompt = createTranslationPrompt(text, fromLang, toLang);

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': result.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response from Claude API');
    }

    return {
      success: true,
      translatedText: data.content[0].text.trim()
    };

  } catch (error) {
    console.error('Error translating text:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

function createTranslationPrompt(text, fromLang, toLang) {
  const languageNames = {
    auto: 'Auto-detect',
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    ar: 'Arabic',
    hi: 'Hindi',
    tr: 'Turkish',
    nl: 'Dutch',
    pl: 'Polish'
  };

  const fromLanguage = languageNames[fromLang] || 'the source language';
  const toLanguage = languageNames[toLang] || 'English';

  if (fromLang === 'auto') {
    return `Translate the following text to ${toLanguage}.

CRITICAL: Return ONLY the translated text. Do NOT add any explanations, comments, notes, or phrases like "Here's the translation". Do NOT use markdown formatting. Just return the translated text exactly as it should be written.

Text:
${text}

Translation:`;
  } else {
    return `Translate the following text from ${fromLanguage} to ${toLanguage}.

CRITICAL: Return ONLY the translated text. Do NOT add any explanations, comments, notes, or phrases like "Here's the translation". Do NOT use markdown formatting. Just return the translated text exactly as it should be written.

Text:
${text}

Translation:`;
  }
}
