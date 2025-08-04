# Changelog

All notable changes to the Notez project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-03

### 🎉 Initial Release
Complete Notion-like note-taking app with Chrome extension for text selection capture.

### ✨ Added

#### Core React Application
- **Notion-style Editor**: Rich text editor with TipTap integration
  - Block-based editing with `/` slash commands
  - Rich formatting (bold, italic, strikethrough, highlight)
  - Headings (H1, H2, H3), lists (bullet, numbered, todo), blockquotes
  - Code blocks, tables, horizontal rules
  - Enhanced toolbar with visual formatting controls
  - Auto-resizing title input with textarea
  - Dark mode support throughout

- **Note Management System**:
  - Create, read, update, delete notes
  - File-based routing with React Router 7
  - Persistent storage via json-server API with localStorage fallback
  - Real-time note synchronization
  - Reading time calculation and metadata display
  - Note tags support

- **Modern UI/UX**:
  - Tailwind CSS v4 with custom typography
  - Responsive design for all screen sizes
  - Beautiful loading states and animations
  - Professional note detail pages with metadata
  - Clean navigation and breadcrumbs

#### Chrome Extension Features
- **Text Selection Capture**:
  - Select text on any webpage to capture to notes
  - Smart tooltip appears on text selection
  - One-click addition to page-specific notes
  - Cross-browser compatibility (Chrome, Arc, Edge)

- **Extension Management**:
  - Popup interface for quick note access
  - URL pattern management for domain-specific enable/disable
  - Settings panel for extension configuration
  - Real-time note preview and editing in popup

- **Background Processing**:
  - Service worker for persistent functionality
  - DOM-independent HTML escaping for security
  - Robust error handling and logging
  - Auto-initialization on browser startup

#### API & Data Layer
- **JSON Server Integration**:
  - RESTful API for note CRUD operations
  - Concurrent development with `pnpm dev:full`
  - Automatic API fallback to localStorage
  - Structured data with timestamps and metadata

- **Content Rendering**:
  - ReactMarkdown for safe HTML/Markdown rendering
  - Custom component styling for all markdown elements
  - HTML to Markdown conversion utilities
  - XSS protection with proper sanitization

#### Development & Build System
- **Modern Tooling**:
  - Vite build system with hot reload
  - TypeScript for type safety
  - ESLint and Prettier configuration
  - Automated extension building with shell scripts

- **Extension Packaging**:
  - Automated build process for Chrome extension
  - Asset optimization and path resolution
  - Installation documentation and guides
  - Development vs production configurations

### 🔧 Technical Improvements

#### Editor Enhancements
- Fixed content flickering issues in TipTap editor
- Implemented debounced updates to prevent re-render loops
- Added proper content synchronization between parent/child components
- Enhanced slash command menu with better positioning
- Improved focus management and cursor positioning

#### Extension Stability
- Resolved "document is not defined" errors in service workers
- Fixed ReferenceError issues in background scripts
- Improved Arc browser compatibility
- Enhanced selection tooltip reliability
- Better error handling and user feedback

#### Performance Optimizations
- Lazy loading for large note content
- Optimized build sizes with tree shaking
- Efficient re-rendering with React optimization patterns
- Debounced API calls and user interactions
- Smart content diffing to prevent unnecessary updates

### 🐛 Bug Fixes
- Fixed editor content flickering during typing
- Resolved service worker DOM access errors
- Fixed URL pattern matching for extension activation
- Corrected note saving and loading race conditions
- Fixed dark mode inconsistencies across components
- Resolved build path issues for extension assets

### 🛠️ Infrastructure
- **Development Environment**:
  - Concurrent development servers (React + JSON Server)
  - Hot reload for both app and extension development
  - Comprehensive logging and debugging tools
  - Type-safe development with TypeScript

- **Build & Deployment**:
  - Automated extension packaging
  - Production-ready builds with optimization
  - Asset bundling and minification
  - Cross-platform compatibility testing

### 📚 Documentation
- Comprehensive README with setup instructions
- Extension installation and usage guides
- Development workflow documentation
- API reference and component documentation
- Troubleshooting guides for common issues

### 🎯 Project Structure
```
notez/
├── app/                    # React application source
│   ├── components/         # Reusable components
│   ├── routes/            # File-based routing
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   └── utils/             # Utility functions
├── public/                # Static assets & extension files
├── extension-build/       # Built extension for installation
├── build/                 # Production React build
└── db.json               # JSON Server database
```

### 🚀 Getting Started
1. Clone the repository
2. Install dependencies: `pnpm install`
3. Start development: `pnpm dev:full`
4. Build extension: `pnpm build:extension`
5. Install extension from `extension-build/` folder

### 🔄 API Endpoints
- `GET /notes` - Fetch all notes
- `GET /notes/:id` - Fetch specific note
- `POST /notes` - Create new note
- `PUT /notes/:id` - Update existing note
- `DELETE /notes/:id` - Delete note

### 🎨 Features Showcase
- **Rich Text Editing**: Full-featured editor with formatting options
- **Text Selection**: Capture text from any website with one click
- **Note Organization**: Tag, search, and organize your notes
- **Cross-Platform**: Works on Chrome, Arc, Edge browsers
- **Responsive Design**: Perfect on desktop and mobile
- **Dark Mode**: Beautiful dark theme support
- **Real-time Sync**: Notes sync across extension and app

---

## Development

### Prerequisites
- Node.js 18+
- pnpm package manager
- Modern browser (Chrome, Arc, Edge)

### Available Scripts
- `pnpm dev` - Start React development server
- `pnpm dev:full` - Start both React app and JSON server
- `pnpm build` - Build React application
- `pnpm build:extension` - Build Chrome extension
- `pnpm db` - Start JSON server only

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Full Changelog**: Initial release with complete note-taking and text selection functionality.
