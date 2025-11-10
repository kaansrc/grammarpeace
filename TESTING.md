# Testing GrammarWise Extension

## Quick Start Guide

### 1. Load Extension in Chrome

1. Open Google Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle switch in top-right corner)
4. Click **"Load unpacked"**
5. Navigate to and select your `grammarwise` folder
6. You should see the GrammarWise extension appear!

### 2. Set Up Your API Key

1. Click the puzzle icon (🧩) in Chrome toolbar
2. Find **GrammarWise** and click it
3. Click **"Open Settings"**
4. Enter your Claude API key from https://console.anthropic.com/
5. Select your default tone (e.g., Professional)
6. Click **"Save Settings"**
7. Click **"Test API"** to verify it works

### 3. Test the Extension

#### Option 1: Test on Any Website
1. Go to any website (e.g., gmail.com, docs.google.com, reddit.com)
2. Type or find some text with errors, like:
   ```
   "me and him goes to the store yesterday"
   ```
3. **Select the text** with your mouse
4. A **purple floating button** will appear next to your selection
5. Click the purple button
6. Choose a tone (optional)
7. Click **"Check Grammar"**
8. See the corrected text!

#### Option 2: Quick Test Page
Open any website and try these examples:

**Example 1 - Basic Grammar:**
```
"Their going to they're house to get there stuff"
```

**Example 2 - Professional Tone:**
```
"hey can u send me that thing we talked about yesterday thx"
```

**Example 3 - Casual Tone:**
```
"Pursuant to our discussion, I would like to request that you forward the aforementioned document at your earliest convenience"
```

### 4. Try the Replace Feature

1. Go to a text field (like a comment box, email compose, etc.)
2. Type some text with errors
3. Select it and check grammar
4. Click **"Replace"** - it will update the text directly!

### 5. Troubleshooting

**Purple button doesn't appear?**
- Make sure you're on a regular webpage (not chrome:// or extension pages)
- Try refreshing the page
- Check if extension is enabled in chrome://extensions/

**API errors?**
- Verify your API key is correct
- Check you have credits in your Anthropic account
- Try the "Test API" button in settings

**Replace doesn't work?**
- Replace only works in editable fields (text boxes, etc.)
- For read-only text, use "Copy" button instead

## Demo Sites to Test On

Try these sites for testing:
- **Gmail** - Write an email
- **Google Docs** - Edit a document
- **Reddit** - Write a comment
- **Twitter/X** - Compose a tweet
- **Any blog comment section**

## What to Expect

- ⚡ **Fast**: Response in 1-2 seconds
- 💰 **Cheap**: ~$0.0001 per check
- 🎯 **Accurate**: Claude Haiku 4.5 is excellent for grammar
- 🎨 **Beautiful**: Smooth animations and clean UI

## Next Steps

Once you verify it works:
1. Create icon PNG files (see icons/README.md)
2. Use it daily to improve your writing
3. Share with friends!
4. Optional: Publish to Chrome Web Store
