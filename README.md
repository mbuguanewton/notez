# Notez - Block-based Note-taking App & Chrome Extension

A Notion-like, block-based note-taking application built with React, TypeScript, and TipTap editor. Features a rich web application and Chrome extension for seamless text selection capture from any webpage.

## 🌟 Features

### 📝 Rich Text Editor
- **Block-based editing** with Notion-style `/` slash commands
- **Rich formatting**: Bold, italic, strikethrough, highlighting
- **Content blocks**: Headings, lists, blockquotes, code blocks, tables
- **Smart toolbar** with visual formatting controls
- **Auto-resizing inputs** and responsive design
- **Dark/light theme** support throughout

### 🌐 Chrome Extension
- **Text selection capture** from any webpage
- **Smart tooltip** appears on text selection
- **Page-specific notes** automatically organized by domain
- **URL pattern management** for domain enable/disable
- **Popup interface** for quick note access and editing
- **Cross-browser compatibility** (Chrome, Arc, Edge)

### 💾 Data Management
- **JSON Server API** for robust note storage
- **localStorage fallback** for offline functionality
- **Real-time synchronization** between app and extension
- **CRUD operations** with proper error handling
- **Metadata tracking** (creation date, reading time, tags)

### 🎨 Modern UI/UX
- **Tailwind CSS v4** with custom typography
- **ReactMarkdown rendering** for safe content display
- **Responsive design** for all screen sizes
- **Beautiful loading states** and smooth animations
- **Professional note layouts** with metadata display

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Modern browser (Chrome, Arc, Edge)

### Development Setup

1. **Clone and install**:
   ```bash
   git clone <repository-url>
   cd notez
   pnpm install
   ```

2. **Start development servers**:
   ```bash
   # Start both React app and JSON server
   pnpm dev:full
   ```
   - React app: http://localhost:5174
   - JSON Server API: http://localhost:3001

3. **Build Chrome extension**:
   ```bash
   pnpm build:extension
   ```

### Chrome Extension Installation

1. **Build the extension** (if not already done):
   ```bash
   pnpm build:extension
   ```

2. **Install in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension-build/` folder

3. **Start using**:
   - Select text on any webpage
   - Click "Add to Page Note" in the tooltip
   - Open extension popup to manage notes
   - View all notes in the React app

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Routing**: React Router v7 with file-based routing
- **Editor**: TipTap (ProseMirror-based) with rich extensions
- **API**: JSON Server for development, RESTful endpoints
- **Build**: Vite with optimized bundling
- **Rendering**: ReactMarkdown for safe content display

### Project Structure
```
notez/
├── app/                    # React application source
│   ├── components/         # Reusable components (NotionEditor, etc.)
│   ├── routes/            # File-based routing pages
│   ├── hooks/             # Custom hooks (useNotesAPI, etc.)
│   ├── services/          # API services and utilities
│   └── utils/             # Content rendering and helpers
├── public/                # Static assets & extension files
│   ├── manifest.json      # Chrome extension manifest
│   ├── background.js      # Service worker script
│   ├── content.js         # Content script for selection
│   └── popup.html/js      # Extension popup interface
├── extension-build/       # Built extension for installation
├── build/                 # Production React build
└── db.json               # JSON Server database
```

### Chrome Extension Flow
1. **Content Script** detects text selection on webpages
2. **Background Script** manages note storage via API
3. **Popup Interface** provides quick note management
4. **React App** displays full note editing interface

### Data Flow
- User selects text → Content script → Background script → API → Database
- Extension popup ↔ API ↔ React app (synchronized)
- LocalStorage fallback when API unavailable

## 📦 Available Scripts

- `pnpm dev` - Start React development server
- `pnpm dev:full` - Start both React app and JSON server concurrently
- `pnpm build` - Build React application for production
- `pnpm build:extension` - Build Chrome extension
- `pnpm db` - Start JSON server only
- `pnpm typecheck` - Run TypeScript type checking

## 🛠️ Development

### API Endpoints
- `GET /notes` - Fetch all notes
- `GET /notes/:id` - Fetch specific note  
- `POST /notes` - Create new note
- `PUT /notes/:id` - Update existing note
- `DELETE /notes/:id` - Delete note

### Extension Development
1. Make changes to React app or extension files
2. Run `pnpm build:extension` to rebuild
3. Reload extension in Chrome Extensions page
4. Test functionality across different websites

### Content Rendering
- HTML content from TipTap editor
- Converted to Markdown for safe rendering
- ReactMarkdown with custom components
- XSS protection and sanitization

## 🚀 Deployment

### Production Build
```bash
pnpm build
```

### Docker Deployment
```bash
docker build -t notez-app .
docker run -p 3000:3000 notez-app
```

Deploy to any Docker-compatible platform:
- AWS ECS, Google Cloud Run, Azure Container Apps
- Digital Ocean, Fly.io, Railway, Vercel

## 📄 Documentation

- **CHANGELOG.md** - Detailed version history and features
- **README.md** - This setup and usage guide
- Extension installation guide in `extension-build/INSTALL.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit changes: `git commit -m 'Add amazing-feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

---

Built with ❤️ using React Router, TipTap, and modern web technologies.
