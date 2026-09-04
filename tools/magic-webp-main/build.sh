#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EMSDK_DIR="$ROOT_DIR/emsdk"
LIBWEBP_DIR="$ROOT_DIR/libwebp"
CMAKE_VENV_DIR="$ROOT_DIR/.cmake-venv"

echo "🔨 Building magic-webp WASM module..."

ensure_libwebp() {
    if [ -f "$LIBWEBP_DIR/CMakeLists.txt" ]; then
        return
    fi

    if ! command -v git >/dev/null 2>&1; then
        echo "❌ git is required to initialize the libwebp submodule."
        exit 1
    fi

    echo "📥 Initializing libwebp submodule..."
    git -C "$ROOT_DIR" submodule update --init --recursive --depth 1 libwebp
}

ensure_emscripten() {
    if command -v emcc >/dev/null 2>&1; then
        return
    fi
    if [ -f "$EMSDK_DIR/emsdk_env.sh" ]; then
        echo "🔌 Activating local emsdk..."
        # shellcheck disable=SC1091
        source "$EMSDK_DIR/emsdk_env.sh"
    fi

    if ! command -v emcc >/dev/null 2>&1; then
        echo "📥 Emscripten not found or installation is incomplete. Installing/repairing local emsdk..."
        bash "$ROOT_DIR/scripts/setup-emsdk.sh"

        echo "🔌 Activating local emsdk..."
        # shellcheck disable=SC1091
        source "$EMSDK_DIR/emsdk_env.sh"
    fi
    source "$EMSDK_DIR/emsdk_env.sh"

    if ! command -v emcc >/dev/null 2>&1; then
        echo "❌ Emscripten activation failed. Try removing emsdk/ and rerunning the build."
        exit 1
    fi
}

ensure_cmake() {
    if command -v cmake >/dev/null 2>&1; then
        return
    fi

    if [ -x "$CMAKE_VENV_DIR/bin/cmake" ]; then
        echo "🔌 Using local CMake from .cmake-venv..."
        export PATH="$CMAKE_VENV_DIR/bin:$PATH"
    fi

    if command -v cmake >/dev/null 2>&1; then
        return
    fi

    if ! command -v python3 >/dev/null 2>&1; then
        echo "❌ cmake is required, and python3 is not available to install a local copy."
        exit 1
    fi

    echo "📥 CMake not found in PATH. Installing a local copy into .cmake-venv..."

    if [ ! -d "$CMAKE_VENV_DIR" ]; then
        python3 -m venv "$CMAKE_VENV_DIR"
    fi

    PIP_DISABLE_PIP_VERSION_CHECK=1 "$CMAKE_VENV_DIR/bin/pip" install cmake
    export PATH="$CMAKE_VENV_DIR/bin:$PATH"

    if ! command -v cmake >/dev/null 2>&1; then
        echo "❌ Local CMake installation failed."
        exit 1
    fi
}

ensure_libwebp
ensure_emscripten
ensure_cmake

mkdir -p "$ROOT_DIR/lib"

echo "📋 Configuring CMake..."
emcmake cmake -S "$ROOT_DIR" -B "$ROOT_DIR/build" -DCMAKE_BUILD_TYPE=Release

echo "🔧 Building..."
cmake --build "$ROOT_DIR/build" --config Release

echo "📦 WASM module generated in lib/..."
cp "$ROOT_DIR/src-js/magic_webp.d.mts" "$ROOT_DIR/lib/magic_webp.d.mts"

echo "✅ WASM build complete! Output in lib/"

