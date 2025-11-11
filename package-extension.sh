#!/bin/bash

# Script to package GrammarWise extension for Chrome Web Store submission

echo "Packaging GrammarWise for Chrome Web Store..."

# Create a temporary directory for packaging
TEMP_DIR="grammarwise-package"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy only the necessary files for the extension
echo "Copying extension files..."
cp manifest.json "$TEMP_DIR/"
cp background.js "$TEMP_DIR/"
cp content.js "$TEMP_DIR/"
cp content.css "$TEMP_DIR/"
cp options.html "$TEMP_DIR/"
cp options.js "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp popup.js "$TEMP_DIR/"

# Copy icons directory
cp -r icons "$TEMP_DIR/"

# Create the ZIP file
OUTPUT_FILE="grammarwise-chrome-webstore.zip"
echo "Creating ZIP file..."
cd "$TEMP_DIR"
zip -r "../$OUTPUT_FILE" . -q

cd ..
rm -rf "$TEMP_DIR"

echo "✅ Package created: $OUTPUT_FILE"
echo ""
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "Next steps:"
echo "1. Go to https://chrome.google.com/webstore/devconsole"
echo "2. Click 'New Item'"
echo "3. Upload $OUTPUT_FILE"
echo "4. Fill in the store listing information (see STORE_LISTING.md)"
echo "5. Add screenshots and promotional images"
echo "6. Submit for review"
echo ""
echo "Don't forget to:"
echo "- Host PRIVACY_POLICY.md publicly (GitHub Pages or your website)"
echo "- Update the privacy policy URL in the store listing"
echo "- Create promotional images (440x280px minimum)"
echo "- Take screenshots of the extension in action"
