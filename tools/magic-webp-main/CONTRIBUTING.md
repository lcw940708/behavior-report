# Contributing to magic-webp

Thank you for your interest in contributing! 🎉

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/magic-webp.git
cd magic-webp

# Install dependencies
pnpm install

# Build WASM module
pnpm build:wasm

# Run demo
pnpm demo:watch
```

## Project Structure

```
magic-webp/
├── src-c/           # C source code (libwebp integration)
│   ├── animation.c  # WebP animation processing
│   └── magic_webp.c # Core functions and error handling
├── src-js/          # TypeScript API
│   ├── index.ts     # Main API and MagicWebp class
│   └── *.test.ts    # Unit tests
├── demo/            # Demo application
│   ├── index.html   # Demo UI
│   ├── main.ts      # Main thread code
│   └── worker.ts    # Web Worker for processing
├── tests/           # Native C tests
│   └── test_webp.c  # C test suite
├── libwebp/         # Google's libwebp (git submodule)
├── pkg/             # Built WASM output (generated)
└── build/           # CMake build directory (generated)
```

## Development Workflow

### 1. Make Changes

- **C code**: Edit files in `src-c/`
- **TypeScript**: Edit files in `src-js/`
- **Demo**: Edit files in `demo/`

### 2. Build

```bash
# Rebuild WASM after C changes
pnpm build:wasm

# TypeScript is built automatically by Vite
```

### 3. Test

```bash
# Run TypeScript tests
pnpm test

# Run native C tests
pnpm test:native

# Run tests in watch mode
pnpm test:watch
```

### 4. Try in Demo

```bash
# Start dev server
pnpm demo:watch

# Open http://localhost:5173
```

## Code Style

- **C**: Follow libwebp style (K&R, 4 spaces)
- **TypeScript**: Use Prettier defaults (2 spaces)
- **Comments**: Explain "why", not "what"

## Testing

- Add tests for new features
- Ensure all tests pass before submitting PR
- Test both TypeScript and C code

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test && pnpm test:native`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Performance Considerations

- Use WebPPicture API for image operations (not manual pixel manipulation)
- Minimize WASM ↔ JS data transfers
- Prefer single-pass operations over multiple passes
- Test with large animated WebP files

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase
- Performance issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

