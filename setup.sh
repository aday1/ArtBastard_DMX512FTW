#!/bin/bash

echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies."
    exit 1
fi

echo "Creating data directory..."
mkdir -p data

echo "Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "Error: Failed to build the application."
    exit 1
fi

echo "Starting the application..."
npm start &

echo "Application is running. Please open your web browser and navigate to http://localhost:3001"
echo "Press Ctrl+C to stop the application."

wait