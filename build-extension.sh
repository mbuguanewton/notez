#!/bin/bash

# Build script for Notez Chrome Extension
# This script builds the React app and prepares it for use as a Chrome extension

echo "🚀 Building Notez Chrome Extension..."

# Build the React app
echo "📦 Building React app..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
  echo "❌ Build failed! Make sure to run 'npm run build' successfully first."
  exit 1
fi

# Create extension directory
echo "📁 Setting up extension directory..."
rm -rf extension-build
mkdir -p extension-build

# Copy built React app files (client-side only for extension)
echo "📋 Copying React app files..."
cp -r build/client/* extension-build/

# Create index.html for the extension (since React Router doesn't generate one for static builds)
echo "📄 Creating index.html for extension..."
cat > extension-build/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notez - Block-based Notes</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <!-- Import the built CSS files -->
    <link rel="stylesheet" href="./assets/root-C2B1KD_b.css">
    <link rel="stylesheet" href="./assets/NotionEditor-Ditqu-Ed.css">
</head>
<body>
    <div id="root"></div>
    <!-- Import the built JavaScript files -->
    <script type="module" src="./assets/entry.client-CZQH0fAc.js"></script>
</body>
</html>
EOF

# Update the index.html with the actual asset filenames (they have hashes)
echo "🔧 Updating asset references in index.html..."
# Find the actual CSS and JS filenames with hashes
ROOT_CSS=$(ls extension-build/assets/root-*.css 2>/dev/null | head -1 | xargs basename)
EDITOR_CSS=$(ls extension-build/assets/NotionEditor-*.css 2>/dev/null | head -1 | xargs basename)
ENTRY_JS=$(ls extension-build/assets/entry.client-*.js 2>/dev/null | head -1 | xargs basename)

# Replace placeholders with actual filenames
if [ -n "$ROOT_CSS" ]; then
    sed -i.bak "s/root-C2B1KD_b.css/$ROOT_CSS/g" extension-build/index.html
fi
if [ -n "$EDITOR_CSS" ]; then
    sed -i.bak "s/NotionEditor-Ditqu-Ed.css/$EDITOR_CSS/g" extension-build/index.html
fi
if [ -n "$ENTRY_JS" ]; then
    sed -i.bak "s/entry.client-CZQH0fAc.js/$ENTRY_JS/g" extension-build/index.html
fi

# Clean up backup files
rm -f extension-build/index.html.bak

# Copy extension-specific files (they should already be in dist from public folder)
echo "✅ Extension files copied from public folder during build"

# Create a simple instructions file
cat > extension-build/INSTALL.md << EOF
# Notez Chrome Extension Installation

## How to install:

1. Open Chrome and go to \`chrome://extensions/\`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select this \`extension-build\` folder
5. The Notez extension should now be installed!

## Features:

- **Popup**: Click the extension icon for quick actions
- **Quick Note**: Press Alt+Shift+N (Win/Linux) or Ctrl+Shift+N (Mac) to open quick note modal
- **Sidepanel**: Press Alt+Shift+S (Win/Linux) or Ctrl+Shift+S (Mac) to open the full app in sidepanel
- **Capture Selection**: Press Alt+Shift+Q (Win/Linux) or Ctrl+Shift+Q (Mac) to save selected text
- **Context Menu**: Right-click to access Notez options
- **Full App**: Access your complete Notez app within Chrome

## Storage:

The extension uses Chrome's local storage, which is separate from your web app's localStorage.
Your notes will be synced across Chrome on the same device but not with the web version.

## Development:

To modify the extension, edit the files in the \`public\` folder of the main project,
then run the build script again.
EOF

echo "✅ Notez Chrome Extension built successfully!"
echo "📍 Extension files are in: extension-build/"
echo "📖 See extension-build/INSTALL.md for installation instructions"
