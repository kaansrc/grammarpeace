# GrammarWise - AI Grammar Checker Chrome Extension

An AI-powered grammar checking Chrome extension that uses Claude Haiku 4.5 API to provide instant, context-aware grammar corrections with customizable tone settings. Fast, affordable, and privacy-focused.

## Features

- **Lightning Fast**: Powered by Claude Haiku 4.5 for instant grammar corrections
- **Super Affordable**: Costs less than a penny per check (see cost estimate below)
- **Customizable Tone**: Choose from multiple tone options (Professional, Casual, Friendly, Formal, Concise)
- **Privacy-Focused**: Your API key is stored locally and never shared
- **No Subscription**: Use your own Claude API key, pay only for what you use
- **Beautiful UI**: Modern, intuitive interface with smooth animations
- **One-Click Replace**: Replace selected text with corrected version instantly
- **Works Everywhere**: Use on any webpage, any text field

## Installation

### From Source (Development)

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/yourusername/grammarwise.git
   cd grammarwise
   ```

2. **Add icons** (see Icons section below)

3. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `grammarwise` directory

4. **Configure your API key**
   - Click on the GrammarWise extension icon in Chrome toolbar
   - Click "Open Settings"
   - Enter your Claude API key (get one from [Anthropic Console](https://console.anthropic.com/))
   - Set your default tone preference
   - Click "Save Settings"
   - Use "Test API" button to verify your key works

## Getting a Claude API Key

1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy the key and paste it in GrammarWise settings

**Note**: API usage is charged by Anthropic based on your usage. See their [pricing page](https://www.anthropic.com/pricing) for details.

## Usage

1. **Select text** on any webpage that you want to check
2. **Click the GrammarWise icon** that appears next to your selection (purple circle with checkmark)
3. **Choose your preferred tone** from the dropdown (optional)
4. **Click "Check Grammar"** to get corrections
5. **Review the corrected text** and either:
   - Click "Replace" to replace the original text (works in editable fields)
   - Click "Copy" to copy to clipboard

## Icons

The extension requires icon files in PNG format. Create or download icons and place them in an `icons` directory:

```
grammarwise/
├── icons/
│   ├── icon16.png   (16x16 px)
│   ├── icon32.png   (32x32 px)
│   ├── icon48.png   (48x48 px)
│   └── icon128.png  (128x128 px)
```

You can create icons using:
- Design tools like Figma, Canva, or Photoshop
- Online icon generators
- AI image generators

**Recommended design**: A checkmark or pen icon with purple/indigo colors to match the extension theme.

## File Structure

```
grammarwise/
├── manifest.json           # Extension configuration
├── background.js           # Service worker for API calls
├── content.js             # Content script for text selection UI
├── content.css            # Styles for floating UI
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── options.html           # Settings page UI
├── options.js             # Settings page logic
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Cost Estimate

GrammarWise uses **Claude Haiku 4.5**, which is optimized for speed and cost-efficiency:

- **Input**: ~$0.80 per million tokens
- **Output**: ~$4.00 per million tokens
- **Typical grammar check**: 100-300 tokens total
- **Estimated cost per check**: ~$0.0001-0.0003 (less than a penny!)
- **Example**: 1,000 grammar checks ≈ $0.10-0.30

This makes GrammarWise extremely affordable for personal use compared to subscription services.

## Customization

### Changing the Model

To use a different Claude model, edit `background.js` and change the `model` parameter:

```javascript
model: 'claude-haiku-4-5',  // Current default - fast and affordable
```

Available models:
- `claude-haiku-4-5` (fastest, most affordable - recommended)
- `claude-3-5-sonnet-20241022` (balanced performance)
- `claude-3-opus-20240229` (highest quality, most expensive)

### Adding More Tone Options

To add custom tones, edit both `content.js` and `background.js`:

**In content.js** (around line 54), add your tone to the dropdown:
```html
<option value="yourTone">Your Tone Name</option>
```

**In background.js** (around line 65), add the tone instruction:
```javascript
yourTone: 'Your tone instruction here.',
```

### Customizing the Prompt

Edit the `createPrompt` function in `background.js` to customize how Claude processes the text.

## Troubleshooting

### Extension icon doesn't appear when selecting text
- Make sure you're on a webpage (not Chrome settings or extension pages)
- Try refreshing the page
- Check if the extension is enabled in `chrome://extensions/`

### "Please set your Claude API key" error
- Open extension settings and enter a valid API key
- Make sure the key starts with `sk-ant-`
- Click "Test API" to verify the key works

### API test fails
- Check your internet connection
- Verify your API key is correct and active
- Check if you have credits available in your Anthropic account

### Replace button doesn't work
- The replace feature only works in editable text fields (text boxes, content-editable divs)
- For static text, use the "Copy" button and paste manually

## Privacy & Security

- Your API key is stored locally in Chrome's sync storage
- API keys are never sent anywhere except directly to Anthropic's API
- Selected text is only sent to Claude API for processing
- No analytics or tracking is implemented

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## License

MIT License - feel free to use, modify, and distribute this extension.

## Credits

- Built with [Claude](https://www.anthropic.com/claude) by Anthropic
- Extension template inspired by modern Chrome extension best practices

## Support

If you encounter issues or have questions:
1. Check the Troubleshooting section above
2. Review your browser console for error messages
3. Verify your API key is valid and has credits
4. Create an issue on GitHub

---

**Note**: This extension is not officially affiliated with Anthropic. It's an independent project that uses the Claude API.
