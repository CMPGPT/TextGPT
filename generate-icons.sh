#!/bin/bash

# Create directories if they don't exist
mkdir -p public/icons

# Create the SVG MessageSquare icon in the TextG.pt yellow color
cat > public/icons/message-square.svg << 'EOL'
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="#FFD166" stroke="#FFD166" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>
EOL

echo "SVG icon created in public/icons/message-square.svg"
echo "Please convert this SVG to the following files manually:"
echo "1. public/icons/icon-192x192.png (PNG, 192x192)"
echo "2. public/icons/icon-512x512.png (PNG, 512x512)"
echo "3. public/favicon.ico (ICO, 32x32)"
echo "4. public/apple-touch-icon.png (PNG, 180x180)"
echo ""
echo "You can use an online converter like https://convertio.co/svg-png/ or any image editing software"
echo "Once you have the images, update manifest.json and layout.tsx as needed" 