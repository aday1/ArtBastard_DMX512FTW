#!/bin/bash

echo "Starting application with browser MIDI support using ts-node..."
echo "This will run the app directly without building"

# Run with ts-node, which compiles on-the-fly
npx ts-node src/server.ts

# If ts-node fails, try with node directly
if [ $? -ne 0 ]; then
  echo "ts-node failed, trying with node directly..."
  node build/server.js
fi