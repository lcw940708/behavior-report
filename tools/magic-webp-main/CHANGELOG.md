# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2026-03-11

### Added
- **Debug mode** - `setDebugMode(true/false)` to control logging (disabled by default in production)
- TypeScript type declarations for Vite worker imports and WASM modules
- Proper error logging (errors always logged, debug logs optional)

### Changed
- **Production-ready logging** - All `console.log` replaced with debug logger (silent by default)
- Demo now explicitly imports assets for proper bundling
- Improved TypeScript type safety with proper EmscriptenModule interface

### Fixed
- TypeScript compilation errors in GitHub Actions
- Missing `_magic_webp_resize_cover` export in CMakeLists.txt
- Vite worker build errors (IIFE format not supported for code-splitting)
- GitHub Pages deployment - `giphy.webp` now properly bundled
- ArrayBuffer type compatibility issues with Blob constructor
- Null safety checks for WASM module initialization

### Documentation
- Added "Debug Mode" section in README with usage examples
- Explained when to enable/disable debug logging

## [1.0.1] - 2026-03-11

### Added
- `MagicWebpWorker` - Easy-to-use Web Worker API for non-blocking UI
- `MagicWebp.fromBytes()` - Load WebP from Uint8Array
- Quality control parameter (0-100) for all operations
- Comprehensive documentation with Worker usage examples
- GitHub Pages demo deployment
- Quality recommendations in README

### Changed
- **Default quality changed from 90 to 75** (balanced quality/size)
- Optimized resize operations using WebPPicture API (5-10x faster)
- Cover mode now uses single-pass resize+crop (2x faster)
- Unified Worker implementation (removed duplicate demo worker)
- Improved README with detailed examples and troubleshooting

### Fixed
- Worker message passing with proper request ID handling
- Correct dimension display in demo for processed images
- Export conflicts in TypeScript modules

### Performance
- 5-10x faster resize operations (SIMD optimizations)
- 2x faster cover mode (single-pass operation)
- Reduced memory usage (in-place operations)

## [0.2.0] - 2026-03-10

### Added
- Initial release with basic WebP processing
- Crop and resize operations
- Animated WebP support
- Multiple resize modes (cover, contain, fill, inside, outside)

## [0.1.0] - 2026-03-09

### Added
- Initial prototype

