const fs = require('fs');

// Create simple SVG icons and save as PNG data URIs
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-size="${size * 0.7}" text-anchor="middle" dominant-baseline="central" fill="white">✓</text>
</svg>`;

  fs.writeFileSync(`icon${size}.svg`, svg);
  console.log(`Created icon${size}.svg`);
});

console.log('\n✅ All SVG icons created!');
console.log('Note: Chrome extensions work with SVG files in manifest v3.');
console.log('If you need PNG, open each SVG in browser and take a screenshot,');
console.log('or use an online SVG to PNG converter.');
