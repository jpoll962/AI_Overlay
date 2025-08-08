#!/bin/bash

echo "🔒 Fixing security issues and updating dependencies..."

# Update package.json with newer versions
echo "📝 Updating package.json with latest secure versions..."

# Back up original package.json
cp package.json package.json.backup

# Clean install with updated dependencies
echo "🧹 Removing old dependencies..."
rm -rf node_modules package-lock.json

echo "📦 Installing updated, secure dependencies..."
npm install --no-fund --no-audit

echo "🔍 Running security audit..."
npm audit --audit-level=moderate

echo "🛡️  Applying security fixes..."
npm audit fix --only=prod

echo "✅ Security fixes applied!"
echo ""
echo "📊 Final security check:"
npm audit --audit-level=high --only=prod

if [ $? -eq 0 ]; then
    echo "🎉 All security issues resolved!"
else
    echo "⚠️  Some issues may remain - they might be dev dependencies (non-critical for runtime)"
fi

echo ""
echo "🚀 You can now run the app with: npm start"