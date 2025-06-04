// Script to fix UI component paths for case sensitivity
const fs = require('fs');
const path = require('path');

// Ensure UI components directory path consistency
const uiComponentsDir = path.join(__dirname, 'components', 'ui');
console.log('Checking UI components directory:', uiComponentsDir);
console.log('Directory exists:', fs.existsSync(uiComponentsDir));

if (!fs.existsSync(uiComponentsDir)) {
  console.error('UI components directory not found!');
  process.exit(1);
}

// Required components that need to be accessible with correct case
const requiredComponents = ['button.tsx', 'input.tsx', 'label.tsx', 'alert.tsx', 'card.tsx'];
const uiFiles = fs.readdirSync(uiComponentsDir);

console.log('Fixing component path issues:');
requiredComponents.forEach(comp => {
  const exists = uiFiles.includes(comp);
  
  if (!exists) {
    // Find component with different case
    const possibleMatch = uiFiles.find(f => f.toLowerCase() === comp.toLowerCase());
    
    if (possibleMatch) {
      console.log(`Case mismatch fixed: ${possibleMatch} -> ${comp}`);
      
      // Read the original file
      const content = fs.readFileSync(path.join(uiComponentsDir, possibleMatch), 'utf8');
      
      // Write it with correct case filename
      fs.writeFileSync(path.join(uiComponentsDir, comp), content);
    } else {
      console.error(`Component ${comp} not found!`);
    }
  } else {
    console.log(`✓ ${comp} already has correct case`);
  }
});

console.log('\nComponent path fixes complete!'); 