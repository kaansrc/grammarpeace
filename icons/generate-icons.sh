#!/bin/bash

# Icon Generator Script for GrammarWise
# This script helps generate PNG icons from the SVG file

echo "GrammarWise Icon Generator"
echo "=========================="
echo ""

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo "✓ ImageMagick found"
    echo ""
    echo "Generating PNG icons from icon.svg..."
    echo ""

    # Convert SVG to different PNG sizes
    convert icon.svg -resize 128x128 icon128.png
    convert icon.svg -resize 48x48 icon48.png
    convert icon.svg -resize 32x32 icon32.png
    convert icon.svg -resize 16x16 icon16.png

    echo "✓ icon128.png created (128x128)"
    echo "✓ icon48.png created (48x48)"
    echo "✓ icon32.png created (32x32)"
    echo "✓ icon16.png created (16x16)"
    echo ""
    echo "All icons generated successfully!"

elif command -v inkscape &> /dev/null; then
    echo "✓ Inkscape found"
    echo ""
    echo "Generating PNG icons from icon.svg..."
    echo ""

    # Convert SVG to different PNG sizes using Inkscape
    inkscape icon.svg -o icon128.png -w 128 -h 128
    inkscape icon.svg -o icon48.png -w 48 -h 48
    inkscape icon.svg -o icon32.png -w 32 -h 32
    inkscape icon.svg -o icon16.png -w 16 -h 16

    echo "✓ icon128.png created (128x128)"
    echo "✓ icon48.png created (48x48)"
    echo "✓ icon32.png created (32x32)"
    echo "✓ icon16.png created (16x16)"
    echo ""
    echo "All icons generated successfully!"

else
    echo "✗ Neither ImageMagick nor Inkscape found"
    echo ""
    echo "To generate icons automatically, install one of:"
    echo ""
    echo "ImageMagick:"
    echo "  Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "  macOS: brew install imagemagick"
    echo "  Windows: Download from https://imagemagick.org/"
    echo ""
    echo "Inkscape:"
    echo "  Ubuntu/Debian: sudo apt-get install inkscape"
    echo "  macOS: brew install inkscape"
    echo "  Windows: Download from https://inkscape.org/"
    echo ""
    echo "Alternative: Convert icon.svg manually"
    echo "  1. Open icon.svg in your browser"
    echo "  2. Take screenshots at different zoom levels"
    echo "  3. Or use an online SVG to PNG converter:"
    echo "     - https://cloudconvert.com/svg-to-png"
    echo "     - https://convertio.co/svg-png/"
    echo ""
fi
