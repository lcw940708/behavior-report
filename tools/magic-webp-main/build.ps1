# Build script for magic-webp using Emscripten

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EmsdkDir = Join-Path $RootDir "emsdk"
$LibwebpDir = Join-Path $RootDir "libwebp"
$BuildDir = Join-Path $RootDir "build"
$LibDir = Join-Path $RootDir "lib"

Write-Host "Building magic-webp with Emscripten..." -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $LibwebpDir "CMakeLists.txt"))) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "git is required to initialize the libwebp submodule."
    }

    Write-Host "Initializing libwebp submodule..." -ForegroundColor Yellow
    & git -C $RootDir submodule update --init --recursive --depth 1 libwebp
}

if (-not (Get-Command emcc -ErrorAction SilentlyContinue)) {
    if (Test-Path (Join-Path $EmsdkDir "emsdk_env.ps1")) {
        Write-Host "Activating local emsdk..." -ForegroundColor Yellow
        & (Join-Path $EmsdkDir "emsdk_env.ps1")
    }

    if (-not (Get-Command emcc -ErrorAction SilentlyContinue)) {
        Write-Host "Emscripten not found or installation is incomplete. Installing/repairing local emsdk..." -ForegroundColor Yellow
        & (Join-Path $RootDir "scripts\setup-emsdk.ps1")

        Write-Host "Activating local emsdk..." -ForegroundColor Yellow
        & (Join-Path $EmsdkDir "emsdk_env.ps1")
    }
}

if (-not (Get-Command emcc -ErrorAction SilentlyContinue)) {
    throw "Emscripten activation failed. Try removing emsdk and rerunning the build."
}

if (-not (Test-Path $LibDir)) {
    New-Item -ItemType Directory -Path $LibDir | Out-Null
}

Write-Host "Running CMake..." -ForegroundColor Yellow
& emcmake cmake -S $RootDir -B $BuildDir -DCMAKE_BUILD_TYPE=Release

Write-Host "Building..." -ForegroundColor Yellow
& cmake --build $BuildDir --config Release

Copy-Item (Join-Path $RootDir "src-js\magic_webp.d.mts") (Join-Path $LibDir "magic_webp.d.mts")

Write-Host "Build complete! Output in lib/" -ForegroundColor Green

