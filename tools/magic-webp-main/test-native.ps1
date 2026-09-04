# Build and run C tests using Emscripten (Node.js mode)

Write-Host "Building C tests with Emscripten..." -ForegroundColor Cyan

# Check if WASM was built first
if (-not (Test-Path "build/libwebp/libwebp.a")) {
    Write-Host "Error: libwebp not found. Please run 'pnpm run build:wasm' first." -ForegroundColor Red
    exit 1
}

# Activate emsdk
Write-Host "Activating emsdk..." -ForegroundColor Yellow
& .\emsdk\emsdk_env.ps1

# Create test output directory
if (-not (Test-Path "test-output")) {
    New-Item -ItemType Directory -Path "test-output" | Out-Null
}

# Compile test with Emscripten for Node.js
Write-Host "Compiling test..." -ForegroundColor Yellow

$emcc = ".\emsdk\upstream\emscripten\emcc.bat"
$sources = "tests/test_webp.c", "src-c/magic_webp.c", "src-c/animation.c", "src-c/gifdec_stb.c", `
    "libwebp/imageio/image_dec.c", "libwebp/imageio/jpegdec.c", "libwebp/imageio/metadata.c", `
    "libwebp/imageio/pngdec.c", "libwebp/imageio/pnmdec.c", "libwebp/imageio/tiffdec.c", `
    "libwebp/imageio/webpdec.c", "libwebp/imageio/wicdec.c", "libwebp/imageio/imageio_util.c"
$includes = "-I", "libwebp/src", "-I", "libwebp"
$libs = "build/libwebp/libwebp.a", "build/libwebp/libwebpdemux.a", "build/libwebp/libwebpmux.a", "build/libwebp/libsharpyuv.a"
$flags = "-O2", "-sNODERAWFS=1", "-sENVIRONMENT=node", "-sALLOW_MEMORY_GROWTH=1", "-sUSE_LIBPNG=1", "-sUSE_LIBJPEG=1", "-DWEBP_HAVE_PNG=1", "-DWEBP_HAVE_JPEG=1"
$output = "-o", "tests/test_webp.cjs"

$allArgs = $sources + $includes + $libs + $flags + $output

& $emcc $allArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed!" -ForegroundColor Red
    exit 1
}

# Run tests
Write-Host "`nRunning tests..." -ForegroundColor Green
& node tests/test_webp.cjs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nTests completed successfully!" -ForegroundColor Green
    Write-Host "Check test-output/ directory for generated WebP files" -ForegroundColor Cyan
} else {
    Write-Host "`nTests failed!" -ForegroundColor Red
    exit 1
}

