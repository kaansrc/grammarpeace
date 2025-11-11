# Chrome Web Store Publishing Checklist

## Before You Submit

### 1. Developer Account Setup
- [ ] Create Chrome Web Store developer account at https://chrome.google.com/webstore/devconsole
- [ ] Pay the $5 one-time registration fee
- [ ] Verify your email address

### 2. Prepare Extension Package
- [x] Package created: `grammarwise-chrome-webstore.zip` (7.5MB)
- [x] Privacy policy written: `PRIVACY_POLICY.md`
- [x] Store listing template created: `STORE_LISTING.md`

### 3. Host Privacy Policy
- [ ] Upload `PRIVACY_POLICY.md` to GitHub repository
- [ ] Make repository public OR
- [ ] Host privacy policy on your own website
- [ ] Copy the public URL (needed for store listing)

### 4. Create Visual Assets

**Required:**
- [ ] Screenshots (minimum 1, recommended 5)
  - Size: 1280x800 or 640x400
  - Show main features: grammar checking, translation, settings
  - Capture on a clean webpage (Gmail, Twitter, etc.)

**Optional but Recommended:**
- [ ] Small promotional tile: 440x280px
- [ ] Large promotional tile: 920x680px
- [ ] Marquee: 1400x560px

**Screenshot Ideas:**
1. Main panel showing grammar corrections
2. Translation tab in action
3. Settings/options page
4. Floating button appearing after text selection
5. Multi-language grammar checking (e.g., Spanish or French)

### 5. Prepare Store Listing Content

From `STORE_LISTING.md`, prepare:
- [ ] Title (max 45 chars): "GrammarWise - AI Grammar & Translator"
- [ ] Short description (max 132 chars)
- [ ] Detailed description (copy from STORE_LISTING.md)
- [ ] Category: Productivity
- [ ] Language: English
- [ ] Support URL (GitHub issues page)
- [ ] Privacy policy URL (from step 3)

### 6. Permissions Justification

When asked about permissions, explain:
- **storage**: Stores API key and user preferences locally
- **activeTab**: Accesses selected text when user clicks extension
- **contextMenus**: Provides right-click menu option
- **host_permissions (api.anthropic.com)**: Communicates with Claude API

### 7. Review & Test
- [ ] Test the packaged extension one more time
- [ ] Verify all features work
- [ ] Check that settings save correctly
- [ ] Test on different websites (Gmail, Twitter, etc.)
- [ ] Test both grammar and translation features

## Submission Process

### Step 1: Upload Extension
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item"
3. Upload `grammarwise-chrome-webstore.zip`
4. Wait for upload to complete

### Step 2: Fill Store Listing
1. **Store listing** tab:
   - Add detailed description
   - Add screenshots (drag to reorder)
   - Upload promotional tiles (if created)
   - Add category: Productivity
   - Add language: English

2. **Privacy practices** tab:
   - Add privacy policy URL
   - Answer data collection questions:
     - Do you collect personal data? NO
     - Do you use cookies? NO
     - Do you use analytics? NO

3. **Distribution** tab:
   - Select visibility: Public
   - Select countries/regions: All or specific
   - Pricing: Free

### Step 3: Submit for Review
- [ ] Review all information
- [ ] Click "Submit for review"
- [ ] Wait for Chrome Web Store team review (typically 1-3 business days)

## After Submission

### During Review
- Monitor your email for any requests from Chrome Web Store team
- Check dashboard for status updates
- Be ready to provide clarifications if needed

### If Rejected
- Read rejection reason carefully
- Fix the issues mentioned
- Re-submit with changes

### After Approval
- [ ] Extension goes live on Chrome Web Store
- [ ] Share the store link with users
- [ ] Add store link to GitHub README
- [ ] Monitor reviews and user feedback
- [ ] Plan for future updates

## Common Rejection Reasons

1. **Missing or inadequate privacy policy**
   - Solution: Ensure PRIVACY_POLICY.md is publicly accessible

2. **Insufficient screenshots**
   - Solution: Add at least 3-5 quality screenshots

3. **Unclear permission usage**
   - Solution: Clearly explain why each permission is needed

4. **Functionality not working**
   - Solution: Test thoroughly before submission

5. **Misleading store listing**
   - Solution: Accurately describe features and requirements

## Pricing & Monetization

Your extension is FREE, but users need their own Anthropic API key:
- Make this clear in the description
- Link to Anthropic's pricing: https://www.anthropic.com/pricing
- Consider adding a "Cost Estimate" section to your description

## Tips for Success

1. **High-quality screenshots**: Use real examples, show actual corrections
2. **Clear description**: Emphasize "15+ languages", "AI-powered", "privacy-focused"
3. **Respond to reviews**: Engage with users, fix reported issues
4. **Regular updates**: Keep the extension maintained
5. **Good support**: Respond to GitHub issues promptly

## Updating Your Extension

When you need to update:
1. Make changes to your code
2. Update version in `manifest.json`
3. Run `./package-extension.sh` to create new package
4. Upload new package to Chrome Web Store dashboard
5. Submit for review (updates also need approval)

## Resources

- [Chrome Web Store Developer Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Best Practices](https://developer.chrome.com/docs/webstore/best_practices/)
- [Branding Guidelines](https://developer.chrome.com/docs/webstore/branding/)

---

**Current Status:** Ready to submit! ✅
- Package: grammarwise-chrome-webstore.zip (7.5MB)
- Privacy Policy: Written
- Store Listing Template: Created

**Next Action:** Create screenshots and promotional images, then submit!
