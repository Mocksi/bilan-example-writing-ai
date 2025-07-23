# Bilan Content Creation Demo

A demonstration application showcasing how to integrate Bilan SDK into an AI-powered content creation assistant. This template demonstrates proper analytics integration patterns for AI applications.

**Important**: This is a CLIENT application that sends analytics data TO Bilan's server. It does not display analytics - that's handled by the Bilan dashboard.

## Features

- 🤖 **AI Content Generation**: Local Ollama + TinyLlama for blog posts, emails, and social media
- 📊 **Comprehensive Analytics**: Full Bilan SDK integration with turn tracking, user feedback, and journey analytics
- 🎨 **Modern UI**: Mantine v7 components with responsive design
- 🔄 **Iterative Refinement**: Multi-turn content improvement workflow
- 📈 **Real-time Tracking**: All user interactions sent to Bilan for analysis

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **Ollama** installed and running locally
- **TinyLlama model** downloaded in Ollama

### Ollama Setup

1. Install Ollama from [https://ollama.ai](https://ollama.ai)
2. Start Ollama service:
   ```bash
   ollama serve
   ```
3. Download TinyLlama model:
   ```bash
   ollama pull tinyllama
   ```
4. Verify installation:
   ```bash
   ollama list
   ```

## Quick Start

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd bilan-example-writing-ai
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your settings (defaults should work for local development).

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OLLAMA_HOST` | Ollama API endpoint | `http://localhost:11434` | Yes |
| `OLLAMA_MODEL` | AI model to use | `tinyllama` | Yes |
| `NEXT_PUBLIC_BILAN_ENDPOINT` | Bilan server URL | - | Optional |
| `NEXT_PUBLIC_BILAN_MODE` | Bilan mode | `local` | No |
| `NEXT_PUBLIC_DEBUG` | Enable debug logging | `false` | No |

## Usage

1. **Select Content Type**: Choose from Blog Post, Email, or Social Media
2. **Provide Brief**: Describe what you want to create
3. **Generate Content**: AI creates initial draft
4. **Provide Feedback**: Accept, reject, or request refinements
5. **Iterate**: Refine until satisfied
6. **View Analytics**: Check Bilan dashboard for interaction insights

## Bilan Integration

This demo showcases comprehensive Bilan SDK usage:

- **Turn Tracking**: Every AI interaction wrapped with `trackTurn()`
- **User Feedback**: Vote collection with `vote()` using turn correlation
- **Journey Analytics**: Complete workflow tracking with `trackJourneyStep()`
- **Conversation Management**: Session lifecycle with `startConversation()` / `endConversation()`
- **Advanced Patterns**: Frustration detection, preference learning, quality signals

All analytics data is sent to Bilan for processing and visualization in the Bilan dashboard.

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting and formatting
npm run lint
npm run format
```

## Project Structure

```
src/
├── app/                 # Next.js App Router
├── components/          # React components
├── lib/                 # Utility libraries
├── hooks/               # Custom React hooks
├── types/               # TypeScript definitions
└── utils/               # Helper functions
```

## Contributing

This is a template repository. Fork it to create your own Bilan integration examples!

## License

MIT License - feel free to use this as a starting point for your own AI applications with Bilan analytics.
