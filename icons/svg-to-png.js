const sharp = require('sharp');
const fs = require('fs');

const sizes = [16, 32, 48, 128];

async function convertAll() {
  for (const size of sizes) {
    try {
      await sharp(`icon${size}.svg`)
        .resize(size, size)
        .png()
        .toFile(`icon${size}.png`);
      console.log(`✅ Created icon${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to create icon${size}.png:`, error.message);
    }
  }
  console.log('\n🎉 All PNG icons created successfully!');
}

convertAll();
