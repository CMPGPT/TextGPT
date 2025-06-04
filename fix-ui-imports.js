// Script to verify UI component imports
const fs = require('fs');
const path = require('path');

// Check if components/ui directory exists
const uiComponentsDir = path.join(__dirname, 'components', 'ui');
console.log('Checking UI components directory:', uiComponentsDir);
console.log('Directory exists:', fs.existsSync(uiComponentsDir));

// List all files in the UI components directory
const uiFiles = fs.existsSync(uiComponentsDir) ? fs.readdirSync(uiComponentsDir) : [];
console.log('UI component files:', uiFiles);

// Check specific components that are being imported
const requiredComponents = ['button.tsx', 'input.tsx', 'label.tsx', 'alert.tsx', 'card.tsx'];
console.log('Required components check:');
requiredComponents.forEach(comp => {
  const exists = uiFiles.includes(comp);
  console.log(`- ${comp}: ${exists ? 'Found' : 'Missing'}`);

  // Check case sensitivity issues
  if (!exists) {
    const possibleMatch = uiFiles.find(f => f.toLowerCase() === comp.toLowerCase());
    if (possibleMatch) {
      console.log(`  Case mismatch found: ${possibleMatch}`);
    }
  }
});

// Check utils file existence
const utilsPath = path.join(__dirname, 'lib', 'utils.ts');
console.log('\nChecking utils.ts:', utilsPath);
console.log('Utils file exists:', fs.existsSync(utilsPath));

console.log('\nDiagnosis complete.'); 