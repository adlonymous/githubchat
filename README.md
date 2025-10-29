# GitHub Repository Analyzer

An AI-powered chat application that helps developers understand and analyze GitHub repositories through natural language conversations. Built with React Router, Hono, Cloudflare Workers, Workers KV and Workers AI.

![GitHub Repository Analyzer](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/24c5a7dd-e1e3-43a9-b912-d78d9a4293bc/public)

## Overview

GitHub Repository Analyzer is an interactive web application that lets you chat with an AI assistant about any GitHub repository. Simply paste a repository URL, and start asking questions about the codebase, architecture, dependencies, best practices, and more.

## Key Features

### 🤖 AI-Powered Analysis
- Chat with an AI assistant specialized in repository analysis
- Ask questions about code structure, dependencies, and architecture
- Get insights on best practices and potential improvements
- Context-aware conversations with repository-specific knowledge

### 📊 Repository Information
- Automatically fetches repository metadata from GitHub API
- Displays repository details including description, topics, license, and more
- Detects if a repository is a fork
- Cached responses for faster performance using Workers KV

### 💬 Chat History
- All conversations are automatically saved to local browser storage
- Access your previous chats from the history page
- Resume conversations at any time
- Delete individual chats or clear all history

### 🎨 Modern UI
- Beautiful, animated interface with gradient backgrounds
- Responsive design that works on all devices
- Dark mode support
- Smooth animations and transitions

## How It Works

1. **Enter Repository**: Paste any GitHub repository URL on the homepage
2. **Repository Analysis**: The app fetches repository information from the GitHub API and caches it
3. **Chat Interface**: Open a chat interface where you can ask questions about the repository
4. **AI Responses**: Cloudflare Workers AI processes your questions and provides intelligent, context-aware answers
5. **History Tracking**: Your conversations are automatically saved for future reference

## Architecture

### Frontend
- **React Router**: Client-side routing and page management
- **React**: UI components and state management
- **Tailwind CSS**: Styling with custom animations
- **Local Storage**: Chat history persistence

### Backend
- **Hono**: API endpoints for chat and repository data
- **Cloudflare Workers AI**: AI model integration for chat responses
- **GitHub REST API**: Repository information fetching
- **Workers KV**: Caching repository data for improved performance

### Key Endpoints
- `POST /api/chat` - Process chat messages with AI
- `POST /api/repo/info` - Fetch repository information by URL
- `GET /api/repo/:owner/:repo` - Fetch repository information by owner/repo

## Tech Stack

- **Runtime**: Cloudflare Workers (edge computing)
- **Frontend Framework**: React 19 + React Router 7
- **Backend Framework**: Hono
- **AI**: Cloudflare Workers AI (Llama 3.1 8B Instruct)
- **Storage**: Workers KV (caching) + Local Storage (chat history)
- **Styling**: Tailwind CSS 4
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Cloudflare account (for deployment)

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy
```

### Configuration

Before deploying, you'll need to:

1. **Create a Workers KV namespace** in Cloudflare Dashboard
2. **Update `wrangler.jsonc`** with your KV namespace ID
3. **Enable Workers AI** in your Cloudflare account

## Project Structure

```
├── app/
│   ├── components/          # React components
│   │   ├── GitHubUrlModal.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── AnimatedBackground.tsx
│   │   └── FloatingElements.tsx
│   ├── routes/              # React Router pages
│   │   ├── home.tsx
│   │   ├── chat.$repoUrl.tsx
│   │   └── history.tsx
│   ├── types/               # TypeScript types
│   │   └── repo.ts
│   └── utils/               # Utility functions
│       └── chatHistory.ts
├── workers/
│   └── app.ts               # Hono API routes
└── wrangler.jsonc           # Cloudflare Workers configuration
```

## Features in Detail

### Repository Analysis
- Fetches comprehensive repository metadata including:
  - Basic info (name, description, visibility)
  - Repository size and default branch
  - License information
  - Topics and tags
  - Fork status
  - Last update timestamps
- Caches responses in Workers KV for 1 hour
- Handles private repositories (if authenticated)

### AI Chat
- Uses specialized system prompts for repository analysis
- Maintains conversation context (last 10 messages)
- Provides actionable insights and recommendations
- Handles errors gracefully with user-friendly messages

### Chat History
- Stores up to 50 recent chats
- Persistent across browser sessions
- Easy navigation to resume conversations
- Quick deletion of individual or all chats

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Hono Documentation](https://hono.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [GitHub REST API](https://docs.github.com/en/rest)

## License

MIT

---

**Built with ❤️ using Cloudflare Workers, React Router, and Workers AI**
