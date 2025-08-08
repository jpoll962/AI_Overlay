#!/bin/bash

echo "🚀 Setting up AI Chat Overlay..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first:"
    echo "   sudo apt update && sudo apt install nodejs npm"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version $NODE_VERSION detected. Version 18+ recommended."
    echo "   Consider upgrading: sudo apt install nodejs"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Installing npm..."
    sudo apt install npm
fi

# Clean install for security
if [ -d "node_modules" ]; then
    echo "🧹 Cleaning previous installation..."
    rm -rf node_modules package-lock.json
fi

# Install dependencies with security audit
echo "📦 Installing dependencies..."
npm install --no-fund --no-audit

echo "🔒 Running security check..."
if npm audit --audit-level=high --only=prod; then
    echo "✅ No high-severity vulnerabilities found"
else
    echo "⚠️  Security issues detected. Running automatic fixes..."
    npm audit fix --only=prod
fi

echo "🛠️  Fixing Electron sandbox permissions..."
SANDBOX_PATH="./node_modules/electron/dist/chrome-sandbox"
if [ -f "$SANDBOX_PATH" ]; then
    echo "📋 Note: Using --no-sandbox flag for development (configured in package.json)"
    echo "   For production, you may want to fix sandbox permissions instead."
else
    echo "⚠️  Sandbox file not found at expected location"
fi

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Configure your AI services in the app UI:"
echo "   - Set working directories for Ollama, Llama.cpp, Coqui-TTS"
echo "   - Use the ▶️ buttons to start services"
echo ""
echo "2. Run the app:"
echo "   npm start"
echo ""
echo "🔧 For development with dev tools:"
echo "   npm run dev"
echo ""
echo "🔒 Security commands:"
echo "   npm run security-check - Check for vulnerabilities"
echo "   npm run security-fix - Fix vulnerabilities automatically"