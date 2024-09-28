#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Update package lists
echo "Updating package lists..."
sudo apt-get update

# Install Node.js and npm
echo "Installing Node.js and npm..."
sudo apt-get install -y nodejs npm

# Verify Node.js and npm installation
node_version=$(node -v)
npm_version=$(npm -v)
echo "Node.js version: $node_version"
echo "npm version: $npm_version"

# Install build essentials (needed for some npm packages)
echo "Installing build essentials..."
sudo apt-get install -y build-essential

# Install additional dependencies for DMX
echo "Installing additional dependencies for DMX..."
sudo apt-get install -y libudev-dev

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Create data directory
echo "Creating data directory..."
mkdir -p data

# Build the application
echo "Building the application..."
npm run build

echo "Installation complete. You can now run the application using './setup.sh'"
echo "To start the application, run: npm start"
echo "Then, open a web browser and navigate to http://localhost:3001"