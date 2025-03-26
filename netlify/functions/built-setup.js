// Using CommonJS for compatibility with Netlify build environment
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

// Get the current filename and directory in ESM context
const __filename = process.argv[1];
const __dirname = path.dirname(__filename);

// Ensure the built directory exists
const builtDir = path.join(__dirname, 'built');
if (!fs.existsSync(builtDir)) {
  console.log('Creating functions/built directory...');
  fs.mkdirSync(builtDir, { recursive: true });
}

// Copy the API function file
const sourceFile = path.join(__dirname, 'api.js');
const destFile = path.join(builtDir, 'api.js');

if (fs.existsSync(sourceFile)) {
  console.log('Copying API function file...');
  fs.copyFileSync(sourceFile, destFile);
  console.log('Function file copied successfully!');
} else {
  console.error('Error: API function source file not found!');
  process.exit(1);
} 