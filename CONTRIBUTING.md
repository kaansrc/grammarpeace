# Contributing to GrammarPeace

Thanks for your interest in contributing to GrammarPeace! This guide will help you get started.

## Development Setup

### Prerequisites
- Google Chrome browser
- A text editor (VS Code, Sublime, etc.)
- Git

### Local Installation

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/grammarpeace.git
   cd grammarpeace
   ```

2. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `grammarpeace` folder

3. **Set up an API key**
   - Click the extension icon → Settings
   - Add your Anthropic or OpenAI API key

4. **Make changes and test**
   - Edit the code
   - Go to `chrome://extensions/` and click the refresh icon on the extension
   - Test your changes

## Project Structure

```
grammarpeace/
├── manifest.json      # Extension config (Manifest V3)
├── background.js      # Service worker - handles API calls
├── content.js         # Injected into pages - handles text selection UI
├── content.css        # Styles for the grammar panel
├── popup.html/js      # Extension popup (click on icon)
├── options.html/js    # Settings page
├── icons/             # Extension icons (16, 32, 48, 128px)
└── docs/              # Website (GitHub Pages)
```

## Code Style

- **No build tools** — This project uses vanilla JavaScript with zero dependencies
- **No frameworks** — Pure CSS, no Tailwind/Bootstrap
- **Keep it simple** — Readable code over clever code
- **Comment complex logic** — Help others understand your thinking

### JavaScript
- Use `const` and `let`, never `var`
- Use template literals for string interpolation
- Use async/await over raw promises
- Add JSDoc comments for functions

### CSS
- Use CSS variables defined in `:root`
- Mobile-first responsive design
- Keep specificity low

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/kaansrc/grammarpeace/issues) first
2. Include:
   - Chrome version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if helpful

### Suggesting Features

Open an issue with:
- Clear description of the feature
- Why it would be useful
- Any implementation ideas

### Submitting Code

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Keep commits focused and atomic
   - Write clear commit messages

3. **Test thoroughly**
   - Test on different websites (Gmail, Google Docs, Twitter, etc.)
   - Test all features: grammar check, improve, tone, translate
   - Test both API providers if possible

4. **Submit a pull request**
   - Describe what you changed and why
   - Link any related issues
   - Include screenshots for UI changes

## Testing Checklist

Before submitting a PR, verify:

- [ ] Extension loads without errors
- [ ] Text selection shows the ✌️ button
- [ ] Grammar check works
- [ ] Improve text works
- [ ] Tone rewriting works (all 5 tones)
- [ ] Translation works
- [ ] Copy button works
- [ ] Replace button works
- [ ] Settings page saves correctly
- [ ] Works on Gmail
- [ ] Works on Google Docs
- [ ] Dark mode looks correct

## Areas We'd Love Help With

- **Browser support** — Firefox/Safari ports
- **New languages** — UI translations
- **Accessibility** — Screen reader support, keyboard navigation
- **Performance** — Faster text selection detection
- **Documentation** — Tutorials, videos, blog posts

## Questions?

- Open an issue for questions about the codebase
- Check existing issues and discussions first

---

Thanks for helping make GrammarPeace better! ✌️
