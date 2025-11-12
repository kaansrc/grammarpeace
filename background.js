// Background service worker for GrammarWise

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'grammarwise-check',
    title: 'Check Grammar with GrammarWise',
    contexts: ['selection'],
    documentUrlPatterns: ['<all_urls>']
  });
  console.log('GrammarWise: Context menu created');
  console.log('GrammarWise: Keyboard shortcut: Ctrl+Shift+G (Cmd+Shift+G on Mac)');
});

// Handle keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  console.log('GrammarWise: Command received:', command);
  if (command === 'check-grammar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        console.log('GrammarWise: Sending keyboard shortcut trigger to tab', tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'triggerFromKeyboard'
        }).catch(err => {
          console.error('GrammarWise: Error sending keyboard trigger:', err);
        });
      }
    });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('GrammarWise: Context menu clicked', info);
  if (info.menuItemId === 'grammarwise-check' && info.selectionText) {
    console.log('GrammarWise: Sending message to tab', tab.id, 'with text:', info.selectionText.substring(0, 50));
    chrome.tabs.sendMessage(tab.id, {
      action: 'openPanelWithText',
      text: info.selectionText
    }).then(() => {
      console.log('GrammarWise: Message sent successfully');
    }).catch(err => {
      console.error('GrammarWise: Error sending message:', err);
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkGrammar') {
    checkGrammar(request.text, request.language, request.tone)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'translateText') {
    translateText(request.text, request.fromLang, request.toLang)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

async function checkGrammar(text, language, tone) {
  try {
    // Get API settings from storage
    const result = await chrome.storage.sync.get(['apiProvider', 'claudeApiKey', 'openaiApiKey', 'maxTokens']);

    const provider = result.apiProvider || 'claude';
    const apiKey = provider === 'claude' ? result.claudeApiKey : result.openaiApiKey;
    const maxTokens = result.maxTokens || 1024;

    if (!apiKey) {
      return {
        success: false,
        error: `Please set your ${provider === 'claude' ? 'Claude' : 'OpenAI'} API key in the extension settings.`
      };
    }

    // Prepare the prompt based on language and tone
    const prompt = createGrammarPrompt(text, language, tone);

    // Call appropriate API
    let correctedText;
    if (provider === 'claude') {
      correctedText = await callClaudeAPI(apiKey, prompt, maxTokens);
    } else {
      correctedText = await callOpenAIAPI(apiKey, prompt, maxTokens);
    }

    return {
      success: true,
      correctedText: correctedText
    };

  } catch (error) {
    console.error('Error checking grammar:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

async function translateText(text, fromLang, toLang) {
  try {
    // Get API settings from storage
    const result = await chrome.storage.sync.get(['apiProvider', 'claudeApiKey', 'openaiApiKey', 'maxTokens']);

    const provider = result.apiProvider || 'claude';
    const apiKey = provider === 'claude' ? result.claudeApiKey : result.openaiApiKey;
    const maxTokens = result.maxTokens || 1024;

    if (!apiKey) {
      return {
        success: false,
        error: `Please set your ${provider === 'claude' ? 'Claude' : 'OpenAI'} API key in the extension settings.`
      };
    }

    // Create translation prompt
    const prompt = createTranslationPrompt(text, fromLang, toLang);

    // Call appropriate API
    let translatedText;
    if (provider === 'claude') {
      translatedText = await callClaudeAPI(apiKey, prompt, maxTokens);
    } else {
      translatedText = await callOpenAIAPI(apiKey, prompt, maxTokens);
    }

    return {
      success: true,
      translatedText: translatedText
    };

  } catch (error) {
    console.error('Error translating text:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

async function callClaudeAPI(apiKey, prompt, maxTokens) {
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
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Claude API request failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.content || !data.content[0] || !data.content[0].text) {
    throw new Error('Invalid response from Claude API');
  }

  return data.content[0].text.trim();
}

async function callOpenAIAPI(apiKey, prompt, maxTokens) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4.1-nano-2025-04-14',
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('OpenAI API error response:', errorData);
    throw new Error(errorData.error?.message || `OpenAI API request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('OpenAI API response:', data);

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid OpenAI response structure:', JSON.stringify(data));
    throw new Error(`Invalid response from OpenAI API. Response: ${JSON.stringify(data).substring(0, 200)}`);
  }

  const message = data.choices[0].message;

  // Check if the model refused to respond
  if (message.refusal) {
    console.error('OpenAI refused to respond:', message.refusal);
    throw new Error(`OpenAI refused to respond: ${message.refusal}`);
  }

  // Check if content is empty
  if (!message.content || message.content.trim() === '') {
    console.error('OpenAI returned empty content:', JSON.stringify(data));
    throw new Error('OpenAI returned an empty response. Please try again.');
  }

  return message.content.trim();
}

function createGrammarPrompt(text, language, tone) {
  const toneInstructions = {
    professional: 'Use a professional and business-appropriate tone.',
    casual: 'Use a casual and conversational tone.',
    friendly: 'Use a friendly and warm tone.',
    formal: 'Use a formal and academic tone.',
    concise: 'Make it concise and to the point, removing unnecessary words.'
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
  const languageName = languageNames[language] || 'the original language';

  let prompt = '';

  if (language === 'auto') {
    prompt = `You are a grammar correction assistant. Your task is to:
1. Detect the language of the input text
2. Fix ALL grammar, spelling, and punctuation errors in that SAME language
3. ${toneInstruction}
4. Keep the text in its ORIGINAL language - DO NOT translate

CRITICAL RULES:
- Return ONLY the corrected text
- Do NOT translate to another language
- Do NOT add explanations, comments, or notes
- Do NOT use markdown formatting
- Do NOT use em dashes (—) - use hyphens (-) or commas instead
- Keep the same language as the input text

Text to correct:
${text}

Corrected text:`;
  } else {
    prompt = `You are a grammar correction assistant. The input text is in ${languageName}. Your task is to:
1. Fix ALL grammar, spelling, and punctuation errors in ${languageName}
2. ${toneInstruction}
3. Keep the text in ${languageName} - DO NOT change the language

CRITICAL RULES:
- Return ONLY the corrected text in ${languageName}
- Do NOT translate to another language
- Do NOT add explanations, comments, or notes
- Do NOT use markdown formatting
- Do NOT use em dashes (—) - use hyphens (-) or commas instead
- The text must remain in ${languageName}

Text to correct:
${text}

Corrected text in ${languageName}:`;
  }

  return prompt;
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

  let prompt = '';

  if (fromLang === 'auto') {
    prompt = `You are a professional translator. Your task is to:
1. Detect the language of the input text
2. Translate it accurately to ${toLanguage}
3. Maintain the meaning, tone, and style of the original text

CRITICAL RULES:
- Return ONLY the translated text in ${toLanguage}
- Do NOT add explanations, comments, or notes
- Do NOT use markdown formatting
- Do NOT add phrases like "Here's the translation"
- Preserve the original formatting and structure

Text to translate:
${text}

Translation in ${toLanguage}:`;
  } else {
    prompt = `You are a professional translator. Your task is to:
1. Translate the following ${fromLanguage} text to ${toLanguage}
2. Maintain the meaning, tone, and style of the original text
3. Ensure natural and fluent ${toLanguage}

CRITICAL RULES:
- Return ONLY the translated text in ${toLanguage}
- Do NOT add explanations, comments, or notes
- Do NOT use markdown formatting
- Do NOT add phrases like "Here's the translation"
- Preserve the original formatting and structure

${fromLanguage} text to translate:
${text}

Translation in ${toLanguage}:`;
  }

  return prompt;
}
