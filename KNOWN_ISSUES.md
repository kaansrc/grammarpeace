# Known Issues and Limitations

## Google Docs Limitations

**Issue**: GrammarWise has limited functionality on Google Docs.

**Why**: Google Docs uses a complex canvas-based editor with custom text rendering inside iframes. This means:
- Text selection works differently than normal webpages
- The floating button may not position correctly
- The "Replace" feature won't work (Google Docs doesn't use standard text inputs)

**Workaround**:
1. Use the **right-click context menu** - this works better on Google Docs
2. Use the **"Copy"** button instead of "Replace"
3. Manually paste the corrected text back into Google Docs

**Alternative**: Use GrammarWise on other text editors that work great:
- Gmail (compose emails)
- Outlook Web
- WordPress
- Medium
- Reddit, Twitter, LinkedIn
- Any standard text area or content-editable div

## Other Apps with Similar Issues

These apps also use custom text rendering and may have limited support:
- Google Sheets
- Notion (uses custom blocks)
- Figma (canvas-based)
- Canva (canvas-based)

**Solution**: For these apps, you can:
1. Write/paste text in a simple text area first
2. Check grammar with GrammarWise
3. Copy the corrected text
4. Paste into the special app

## Where GrammarWise Works Best

✅ **Fully supported**:
- Gmail
- Outlook
- All standard text inputs
- Content-editable divs
- Markdown editors
- WordPress
- Medium
- Social media (Twitter, LinkedIn, Reddit, Facebook)
- Chat applications (Discord, Slack web)
- Forums and comment sections

## Troubleshooting

### Floating button appears at wrong position
- This can happen on complex pages with custom rendering
- **Solution**: Use the right-click context menu instead

### Replace button doesn't work
- This is expected on non-editable text or special editors
- **Solution**: Use the "Copy" button and paste manually

### Button doesn't appear at all
1. Check browser console for errors (F12 → Console tab)
2. Make sure extension is loaded and enabled
3. Try refreshing the page
4. Try the right-click context menu as alternative

### Works on some sites but not others
- Some sites have Content Security Policy (CSP) that blocks extensions
- Some sites use shadow DOM which can interfere
- **Solution**: Use the right-click menu or copy text to a working site

## Feature Support Table

| Feature | Standard Sites | Google Docs | Gmail | Special Editors |
|---------|---------------|-------------|-------|-----------------|
| Floating Button | ✅ | ⚠️ May not position correctly | ✅ | ⚠️ Varies |
| Right-Click Menu | ✅ | ✅ | ✅ | ✅ |
| Copy Correction | ✅ | ✅ | ✅ | ✅ |
| Replace Text | ✅ | ❌ | ✅ | ⚠️ Varies |

**Legend**:
- ✅ Fully supported
- ⚠️ Partially supported
- ❌ Not supported
