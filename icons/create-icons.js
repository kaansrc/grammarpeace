const fs = require('fs');

// Create simple SVG icons with peace sign emoji on white circular background
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const borderWidth = size * 0.05; // 5% of size
  const radius = size / 2;
  const innerRadius = radius - borderWidth / 2;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- White circular background -->
  <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>

  <!-- Black border -->
  <circle cx="${radius}" cy="${radius}" r="${innerRadius}" fill="none" stroke="black" stroke-width="${borderWidth}"/>

  <!-- Peace sign emoji -->
  <text x="50%" y="50%" font-size="${size * 0.55}" text-anchor="middle" dominant-baseline="central">✌️</text>
</svg>`;

  fs.writeFileSync(`icon${size}.svg`, svg);
  console.log(`Created icon${size}.svg`);
});

console.log('\n✅ All SVG icons created!');
console.log('Note: Chrome extensions work with SVG files in manifest v3.');
console.log('If you need PNG, run: node svg-to-png.js');
