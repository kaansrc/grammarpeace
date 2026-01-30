# GrammarPeace ✌️

**Free, open-source grammar checker powered by Claude & OpenAI.**

Stop paying $144/year for Grammarly. GrammarPeace gives you the same features — grammar checking, tone rewriting, and translation — using the best AI models available, for free.

[Website](https://grammarpeace.com) · [Chrome Web Store](https://chromewebstore.google.com/detail/grammarpeace-ai-grammar-c/llbcjpcjioapecjbkibpacpjhfjknhgh) · [Report Bug](https://github.com/kaansrc/grammarpeace/issues)

---

## Why GrammarPeace?

| Feature | Grammarly | GrammarPeace |
|---------|-----------|--------------|
| Price | $144/year | **Free** |
| AI Model | Proprietary | Claude & OpenAI (state-of-the-art) |
| Data Privacy | Collects your writing | **Your data stays yours** |
| Open Source | No | **Yes** |
| Word Limits | Yes | **No** |

## Features

- **Grammar Check** — Instant grammar and spelling corrections with one-click fixes
- **Improve Text** — Make your writing sound more natural and native
- **Tone Rewriting** — Rewrite text as Professional, Casual, Friendly, Formal, or Concise
- **Translation** — Translate between 15+ languages instantly
- **Explain Corrections** — Learn why changes were made
- **Diff View** — See exactly what changed with highlighted differences
- **Writing Statistics** — Word count, reading time, Flesch readability score
- **Quick Presets** — Save your favorite language + tone combinations
- **History** — Access your recent corrections
- **Dark Mode** — Easy on the eyes
- **Works Everywhere** — Gmail, Twitter, LinkedIn, any website

## How It Works

1. **Select text** on any webpage
2. **Click the ✌️ button** that appears
3. **Choose an action**: Check, Improve, Tone, or Translate
4. **Copy or Replace** the result with one click

**Keyboard shortcut**: `Ctrl+Shift+G` (or `Cmd+Shift+G` on Mac)

## Installation

### Chrome Web Store (Recommended)
[Install from Chrome Web Store](https://chromewebstore.google.com/detail/grammarpeace-ai-grammar-c/llbcjpcjioapecjbkibpacpjhfjknhgh)

### Manual Installation
1. Download or clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** → select this folder
5. Done!

## Setup

GrammarPeace requires an API key from Anthropic or OpenAI:

1. Click the extension icon → **Settings**
2. Choose your AI provider:
   - **Anthropic (Claude)**: [console.anthropic.com](https://console.anthropic.com/)
   - **OpenAI**: [platform.openai.com](https://platform.openai.com/)
3. Paste your API key and save

**API Cost**: Typical usage costs a few cents per month. Much cheaper than $12/month subscriptions.

## Supported AI Models

GrammarPeace uses the latest AI models for fast, accurate results:

| Provider | Model | Notes |
|----------|-------|-------|
| **Anthropic** | Claude Haiku 4.5 | Fast, cost-effective, excellent quality |
| **OpenAI** | GPT-5 Nano | Lightweight and efficient |

You can switch between providers in Settings. Both deliver excellent grammar checking at minimal cost.

## Cost Comparison

**Grammarly Premium**: $144/year ($12/month)

**GrammarPeace**: Pay only for what you use

| Provider | Input | Output | Cost per 1000 checks* |
|----------|-------|--------|----------------------|
| Claude Haiku 4.5 | $1.00/M tokens | $5.00/M tokens | ~$0.30 |
| GPT-5 Nano | $0.10/M tokens | $0.40/M tokens | ~$0.025 |

*Estimated based on ~100 input tokens + ~100 output tokens per grammar check.

### Real-world example

A heavy user checking 100 texts per day:
- **Grammarly**: $144/year (fixed)
- **Claude Haiku 4.5**: ~$11/year
- **GPT-5 Nano**: ~$0.90/year

That's **13-160x cheaper** than Grammarly, with better AI.

## Supported Languages

English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Turkish, Dutch, Polish

## Privacy

GrammarPeace is designed with privacy as a core principle:

- **No servers** — We don't operate any servers. Zero.
- **No accounts** — No sign-up, no login, no tracking.
- **No data collection** — We don't collect analytics, usage stats, or personal data.
- **Direct API calls** — Your text goes directly from your browser to the AI provider.
- **Local storage only** — Your API key and settings stay in your browser.
- **Open source** — Read the code yourself.

[Full Privacy Policy](https://grammarpeace.com/privacy.html)

## File Structure

```
grammarpeace/
├── manifest.json      # Extension configuration (Manifest V3)
├── background.js      # Service worker for API calls
├── content.js         # Content script for text selection UI
├── content.css        # Styles for the grammar panel
├── popup.html/js      # Extension popup
├── options.html/js    # Settings page
├── icons/             # Extension icons
└── docs/              # Website files
```

## Tech Stack

- Chrome Extension Manifest V3
- Anthropic Claude API / OpenAI API
- Vanilla JavaScript (zero dependencies)
- Pure CSS (no frameworks)

## Contributing

Contributions welcome!

- **Found a bug?** [Open an issue](https://github.com/kaansrc/grammarpeace/issues)
- **Have an idea?** [Suggest a feature](https://github.com/kaansrc/grammarpeace/issues)
- **Want to help?** Submit a pull request

## License

MIT License — use it however you want.

---

**Made with ✌️ by [kaansrc](https://github.com/kaansrc)**

*GrammarPeace is not affiliated with Anthropic or OpenAI. It's an independent open-source project.*
