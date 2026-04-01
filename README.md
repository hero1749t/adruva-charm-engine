# Adruva Charm Engine

A modern, production-ready restaurant management and charm platform built with cutting-edge web technologies.

## Getting Started

### Prerequisites

- Node.js (16+ recommended)
- npm or bun package manager

### Installation

Follow these steps to get started:

```sh
# Step 1: Clone the repository
git clone https://github.com/hero1749t/adruva-charm-engine.git

# Step 2: Navigate to the project directory
cd adruva-charm-engine

# Step 3: Install the necessary dependencies
npm install
# or
bun install

# Step 4: Start the development server
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint checks
- `npm run preview` - Preview production build locally
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode

## Technology Stack

This project is built with:

- **Vite** - Lightning-fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - Modern UI library
- **shadcn/ui** - High-quality React components
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend as a Service
- **Capacitor** - Cross-platform app framework
- **TanStack Query** - Data fetching and caching

## Project Structure

```
src/
├── components/     # React components
├── pages/         # Page components
├── lib/           # Utility functions and helpers
├── services/      # API services and business logic
├── types/         # TypeScript type definitions
└── test/          # Test setup and utilities
```

## Testing

The project uses Vitest for unit testing with jsdom environment:

```sh
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Building for Production

```sh
npm run build
```

The build outputs to the `dist/` directory and is ready for deployment.

## License

This project is private and proprietary.
