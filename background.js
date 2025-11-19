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

  // Setup keep-alive alarm
  setupKeepAlive();
});

// Keep service worker alive to prevent context invalidation
function setupKeepAlive() {
  // Create an alarm that fires every 20 seconds
  chrome.alarms.create('keepAlive', { periodInMinutes: 0.33 }); // 20 seconds
  console.log('GrammarWise: Keep-alive alarm created');
}

// Handle alarm to keep service worker alive
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Simple operation to keep service worker alive
    console.log('GrammarWise: Keep-alive ping');
  }
});

// Ensure keep-alive is set up on startup
chrome.runtime.onStartup.addListener(() => {
  setupKeepAlive();
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
  // Handle ping requests for context validation
  if (request.action === 'ping') {
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'checkGrammar') {
    checkGrammar(request.text, request.language)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'rewriteWithTone') {
    rewriteWithTone(request.text, request.tone)
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

async function checkGrammar(text, language) {
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

    // Prepare the prompt based on language only (no tone)
    const prompt = createGrammarPrompt(text, language);

    // Call appropriate API
    let correctedText;
    if (provider === 'claude') {
      correctedText = await callClaudeAPI(apiKey, prompt, maxTokens);
    } else {
      correctedText = await callOpenAIAPI(apiKey, prompt, maxTokens);
    }

    // Check if the text was actually changed
    const originalTrimmed = text.trim();
    const correctedTrimmed = correctedText.trim();

    if (originalTrimmed === correctedTrimmed) {
      return {
        success: true,
        noChanges: true,
        message: 'Great! No grammar errors found.'
      };
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

async function rewriteWithTone(text, tone) {
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

    // Prepare the prompt for tone rewriting
    const prompt = createToneRewritePrompt(text, tone);

    // Call appropriate API
    let rewrittenText;
    if (provider === 'claude') {
      rewrittenText = await callClaudeAPI(apiKey, prompt, maxTokens);
    } else {
      rewrittenText = await callOpenAIAPI(apiKey, prompt, maxTokens);
    }

    return {
      success: true,
      rewrittenText: rewrittenText
    };

  } catch (error) {
    console.error('Error rewriting with tone:', error);
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

function createGrammarPrompt(text, language) {
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

  const languageName = languageNames[language] || 'the original language';

  let prompt = '';

  if (language === 'auto') {
    prompt = `You are a grammar correction assistant. Your ONLY task is to:
1. Detect the language of the input text
2. Fix ALL grammar, spelling, and punctuation errors in that SAME language
3. Maintain the EXACT same writing style, tone, and voice of the original text
4. Keep the text in its ORIGINAL language - DO NOT translate

CRITICAL RULES:
- Return ONLY the corrected text with errors fixed
- Do NOT change the tone or style
- Do NOT rewrite or rephrase unless fixing errors
- Do NOT translate to another language
- Do NOT add explanations, comments, or notes
- Do NOT use markdown formatting
- Do NOT use em dashes (—) - use hyphens (-) or commas instead
- Preserve the author's original voice and style

Text to correct:
${text}

Corrected text:`;
  } else {
    prompt = `You are a grammar correction assistant. The input text is in ${languageName}. Your ONLY task is to:
1. Fix ALL grammar, spelling, and punctuation errors in ${languageName}
2. Maintain the EXACT same writing style, tone, and voice of the original text
3. Keep the text in ${languageName} - DO NOT change the language

CRITICAL RULES:
- Return ONLY the corrected text with errors fixed
- Do NOT change the tone or style
- Do NOT rewrite or rephrase unless fixing errors
- Do NOT translate to another language
- Do NOT add explanations, comments, or notes
- Do NOT use markdown formatting
- Do NOT use em dashes (—) - use hyphens (-) or commas instead
- The text must remain in ${languageName}
- Preserve the author's original voice and style

Text to correct:
${text}

Corrected text in ${languageName}:`;
  }

  return prompt;
}

function createToneRewritePrompt(text, tone) {
  const toneInstructions = {
    professional: {
      description: 'professional and business-appropriate',
      details: 'Use formal language, avoid slang, maintain clarity and professionalism suitable for business communication.'
    },
    casual: {
      description: 'casual and conversational',
      details: 'Use everyday language, contractions are fine, write as you would speak to a friend while keeping it clear.'
    },
    friendly: {
      description: 'friendly and warm',
      details: 'Use welcoming and approachable language, show empathy and warmth while maintaining professionalism.'
    },
    formal: {
      description: 'formal and academic',
      details: 'Use sophisticated vocabulary, avoid contractions, maintain academic rigor and formal structure.'
    },
    concise: {
      description: 'concise and to-the-point',
      details: 'Remove unnecessary words, use direct language, keep sentences short and impactful.'
    },
    clear: {
      description: 'clear, improved, and well-structured',
      details: 'Restructure sentences for better clarity and flow. Simplify complex phrasing, improve logical connections between ideas, and make the writing easier to understand while preserving the core message and intent.'
    }
  };

  const toneInfo = toneInstructions[tone] || toneInstructions.professional;

  return `You are a professional writing assistant. Your task is to rewrite the following text with a ${toneInfo.description} tone.

INSTRUCTIONS:
1. Rewrite the text to match the ${toneInfo.description} tone
2. ${toneInfo.details}
3. Fix any grammar, spelling, or punctuation errors
4. Keep the text in the SAME language as the input
5. Maintain the core message and meaning

CRITICAL RULES:
- Return ONLY the rewritten text
- Do NOT translate to another language
- Do NOT add explanations, comments, or notes
- Do NOT use markdown formatting
- Do NOT use em dashes (—) - use hyphens (-) or commas instead
- Write in correct, fluent English (or the original language if not English)

Original text:
${text}

Rewritten text with ${toneInfo.description} tone:`;
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
