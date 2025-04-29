const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create build directory if it doesn't exist
console.log('Creating build directory...');
if (!fs.existsSync('./build')) {
  fs.mkdirSync('./build');
}

// Ensure build/public directory exists
console.log('Creating build/public directory...');
if (!fs.existsSync('./build/public')) {
  fs.mkdirSync('./build/public', { recursive: true });
}

// Copy static files first
console.log('Copying static files...');
try {
  execSync('cp -R src/public/* build/public/');
  console.log('Static files copied successfully');
} catch (error) {
  console.error('Error copying static files:', error.message);
}

// List all TypeScript files in src directory
console.log('Finding TypeScript files to compile...');
const findFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && file !== 'api.ts') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
};

const tsFiles = findFiles('./src');
console.log(`Found ${tsFiles.length} TypeScript files to compile`);

// Compile each TypeScript file separately
console.log('Compiling TypeScript files individually...');
let successCount = 0;
let errorCount = 0;

tsFiles.forEach(filePath => {
  try {
    console.log(`Compiling ${filePath}...`);
    execSync(`npx tsc ${filePath} --outDir build --skipLibCheck --esModuleInterop`);
    successCount++;
    console.log(`Successfully compiled ${filePath}`);
  } catch (error) {
    errorCount++;
    console.error(`Error compiling ${filePath}:`, error.message);
  }
});

console.log('--------------------');
console.log(`Build completed with ${successCount} successes and ${errorCount} errors`);
console.log('--------------------');

// Try to copy API file as JS to ensure it exists
if (fs.existsSync('./src/api.ts')) {
  try {
    console.log('Transpiling API file manually...');
    const apiContent = fs.readFileSync('./src/api.ts', 'utf8');
    // Very basic TypeScript to JavaScript conversion
    let jsContent = apiContent
      .replace(/import.*?from\s+['"](.+?)['"];?/g, 'const $1 = require("$1");')
      .replace(/export\s+{(.+?)}/g, 'module.exports = { $1 }')
      .replace(/(\w+):\s+\w+/g, '$1') // Remove type annotations
      .replace(/<.+?>/g, ''); // Remove generic type parameters
      
    fs.writeFileSync('./build/api.js', jsContent);
    console.log('API file manually transpiled');
  } catch (error) {
    console.error('Error transpiling API file:', error.message);
  }
}

console.log('Build process completed!');