const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set environment variable
process.env.NODE_ENV = 'production';
console.log(`NODE_ENV set to: ${process.env.NODE_ENV}`);

// Check if TypeScript is installed
try {
  require.resolve('typescript');
  console.log('TypeScript is available');
} catch (e) {
  console.log('Installing TypeScript...');
  execSync('npm install --no-save typescript@5.0.4', { stdio: 'inherit' });
}

// Check if necessary type definitions are installed
const requiredTypes = ['@types/node', '@types/react', '@types/react-dom'];
for (const type of requiredTypes) {
  try {
    require.resolve(type);
    console.log(`${type} is available`);
  } catch (e) {
    console.log(`Installing ${type}...`);
    execSync(`npm install --no-save ${type}`, { stdio: 'inherit' });
  }
}

// Check if necessary LangChain dependencies are installed
const requiredDependencies = [
  { name: '@langchain/core', version: '0.2.11' },
  { name: '@langchain/textsplitters', version: '0.1.5' }
];
for (const dep of requiredDependencies) {
  try {
    require.resolve(dep.name);
    console.log(`${dep.name} is available`);
  } catch (e) {
    console.log(`Installing ${dep.name}@${dep.version}...`);
    execSync(`npm install --no-save ${dep.name}@${dep.version}`, { stdio: 'inherit' });
  }
}

// Run the build
console.log('Running Next.js build...');
execSync('npx next build', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } }); 