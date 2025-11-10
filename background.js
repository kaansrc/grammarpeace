// Background service worker for GrammarWise

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkGrammar') {
    checkGrammarWithClaude(request.text, request.tone)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

async function checkGrammarWithClaude(text, tone) {
  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['apiKey']);

    if (!result.apiKey) {
      return {
        success: false,
        error: 'Please set your Claude API key in the extension settings.'
      };
    }

    // Prepare the prompt based on tone
    const prompt = createPrompt(text, tone);

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

function createPrompt(text, tone) {
  const toneInstructions = {
    professional: 'Make it professional and business-appropriate.',
    casual: 'Make it casual and conversational.',
    friendly: 'Make it friendly and warm.',
    formal: 'Make it formal and academic.',
    concise: 'Make it concise and to the point.'
  };

  const toneInstruction = toneInstructions[tone] || toneInstructions.professional;

  return `You are a grammar checking assistant. Please check the following text for grammar, spelling, and punctuation errors. ${toneInstruction}

Return ONLY the corrected text without any explanations, comments, or additional formatting. Do not include phrases like "Here's the corrected version" or any markdown formatting.

Text to check:
${text}`;
}
