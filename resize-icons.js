const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function resizeIcon() {
  try {
    // Create favicon.ico
    await sharp('public/icons/message-icon.png')
      .resize(32, 32)
      .toFile('public/favicon.ico');

    console.log('Created favicon.ico');

    // Create 192x192 icon
    await sharp('public/icons/message-icon.png')
      .resize(192, 192)
      .toFile('public/icons/icon-192x192.png');

    console.log('Created 192x192 icon');

    // Create 512x512 icon
    await sharp('public/icons/message-icon.png')
      .resize(512, 512)
      .toFile('public/icons/icon-512x512.png');

    console.log('Created 512x512 icon');

    console.log('All icons created successfully.');
  } catch (error) {
    console.error('Error creating icons:', error);
  }
}

resizeIcon(); 