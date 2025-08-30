#!/bin/bash

echo "🚀 Building WizPay for Render deployment..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies and build
echo "📦 Installing frontend dependencies..."
cd front-end
npm install --legacy-peer-deps

echo "🔨 Building frontend for production..."
npm run build

echo "✅ Build completed successfully!"
echo "🎯 Ready for Render deployment!"

# Go back to root
cd ..
