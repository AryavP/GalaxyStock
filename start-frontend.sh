#!/bin/bash
# Quick start script for GalacticStocks frontend

echo "Starting GalacticStocks frontend..."
cd "$(dirname "$0")/frontend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the dev server
echo "Starting Vite dev server on http://localhost:5173"
npm run dev
