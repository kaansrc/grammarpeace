const fs = require('fs');

// Create simple SVG icons with peace sign emoji on white circular background
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  // Use 2px border for all sizes (matches button design)
  const borderWidth = 2;
  const radius = size / 2;
  const innerRadius = radius - (borderWidth / 2);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- White circular background -->
  <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>

  <!-- Black border (2px like the button) -->
  <circle cx="${radius}" cy="${radius}" r="${innerRadius}" fill="none" stroke="black" stroke-width="${borderWidth}"/>

  <!-- Peace sign emoji centered -->
  <text x="${radius}" y="${radius}" font-size="${size * 0.6}" text-anchor="middle" dominant-baseline="middle" fill="black">✌️</text>
</svg>`;

  fs.writeFileSync(`icon${size}.svg`, svg);
  console.log(`Created icon${size}.svg`);
});

console.log('\n✅ All SVG icons created!');
console.log('Note: Chrome extensions work with SVG files in manifest v3.');
console.log('If you need PNG, run: node svg-to-png.js');
