# Icons Directory

This directory should contain the extension icons in PNG format.

## Required Icons

You need to create 4 icon files:

- `icon16.png` - 16x16 pixels (used in favicon)
- `icon32.png` - 32x32 pixels (used in extension management)
- `icon48.png` - 48x48 pixels (used in extension management)
- `icon128.png` - 128x128 pixels (used in Chrome Web Store)

## Design Recommendations

**Theme**: Purple/Indigo gradient to match the extension UI
**Icon Style**: Modern, minimal
**Suggested Elements**:
- Checkmark icon (represents grammar checking)
- Pen/pencil icon (represents writing)
- Letter "G" or "GW" monogram

## How to Create Icons

### Option 1: Using Figma or Design Tools
1. Create a new design at 128x128px
2. Design your icon with the theme colors (#6366f1, #4f46e5)
3. Export at different sizes (128px, 48px, 32px, 16px)

### Option 2: Using Online Generators
1. Visit sites like:
   - flaticon.com
   - icons8.com
   - favicon.io
2. Search for "checkmark" or "grammar" icons
3. Customize colors to match (#6366f1)
4. Download in required sizes

### Option 3: Using AI Image Generators
1. Use DALL-E, Midjourney, or similar
2. Prompt: "Simple, modern app icon for grammar checker, purple gradient, checkmark symbol, flat design"
3. Resize to required dimensions

### Option 4: Simple SVG to PNG Conversion

Create a simple SVG icon and convert it to PNG using an online converter:

**SVG Code Example**:
```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#grad)"/>
  <path d="M40 64 L56 80 L88 48" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Save this as `icon.svg`, then use an online SVG to PNG converter to create all required sizes.

## Quick Setup with ImageMagick (if installed)

If you have ImageMagick installed, you can create basic placeholder icons:

```bash
# Create a simple purple icon with white checkmark
convert -size 128x128 xc:"#6366f1" -fill white -draw "circle 64,64 64,20" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 32x32 icon32.png
convert icon128.png -resize 16x16 icon16.png
```

## Verification

After creating icons, verify:
1. All 4 files exist in this directory
2. Files are PNG format
3. Dimensions are correct
4. Icons are visible and clear at all sizes
5. Colors match the extension theme
