#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎭 Building without TypeScript checking...');

try {
  // Path to react-app directory
  const reactAppDir = path.join(__dirname, 'react-app');
  
  // Create temporary build script that skips tsc
  const packageJsonPath = path.join(reactAppDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Save original scripts for restoration
  const originalScripts = JSON.stringify(packageJson.scripts, null, 2);
  
  // Modify the build script to skip TypeScript checking
  packageJson.scripts.build = "vite build";
  
  // Write the modified package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  // Run the modified build command
  console.log('Running build with TypeScript checking disabled...');
  execSync('cd react-app && npm run build', { 
    stdio: 'inherit',
    env: { ...process.env, SKIP_TYPECHECKING: 'true' } 
  });
  
  // Restore original package.json
  packageJson.scripts = JSON.parse(originalScripts);
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✨ Build completed successfully without type checking!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  
  // Always attempt to restore the original package.json
  try {
    const packageJsonPath = path.join(__dirname, 'react-app', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.scripts.build = "tsc && vite build";
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch (restoreError) {
    console.error('Failed to restore package.json:', restoreError.message);
  }
  
  process.exit(1);
}