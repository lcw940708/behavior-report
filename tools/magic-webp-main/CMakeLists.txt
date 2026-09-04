cmake_minimum_required(VERSION 3.15)
project(magic-webp C)

set(CMAKE_C_STANDARD 11)

# ────────────────────────────────────────────────────────────────────────────
# Build libwebp
# ────────────────────────────────────────────────────────────────────────────

# Enable image format support for Emscripten
if(EMSCRIPTEN)
    # Use Emscripten ports for image libraries
    add_compile_options(-sUSE_LIBPNG=1 -sUSE_LIBJPEG=1)
    add_link_options(-sUSE_LIBPNG=1 -sUSE_LIBJPEG=1)

    # Define macros for imageio decoders
    add_compile_definitions(WEBP_HAVE_PNG=1 WEBP_HAVE_JPEG=1)

    # Create fake targets for find_package to find
    add_library(PNG::PNG INTERFACE IMPORTED)
    add_library(JPEG::JPEG INTERFACE IMPORTED)

    # Tell CMake we found these packages
    set(PNG_FOUND TRUE CACHE BOOL "" FORCE)
    set(JPEG_FOUND TRUE CACHE BOOL "" FORCE)
    set(GIF_FOUND FALSE CACHE BOOL "" FORCE)

    # Tell libwebp that we have these libraries
    set(WEBP_HAVE_PNG TRUE CACHE BOOL "Enable PNG support" FORCE)
    set(WEBP_HAVE_JPEG TRUE CACHE BOOL "Enable JPEG support" FORCE)
    set(WEBP_HAVE_GIF FALSE CACHE BOOL "Enable GIF support" FORCE)
endif()

set(WEBP_BUILD_ANIM_UTILS OFF CACHE BOOL "Build animation utilities")
set(WEBP_BUILD_CWEBP OFF CACHE BOOL "Build cwebp")
set(WEBP_BUILD_DWEBP OFF CACHE BOOL "Build dwebp")
set(WEBP_BUILD_GIF2WEBP OFF CACHE BOOL "Build gif2webp")
set(WEBP_BUILD_IMG2WEBP OFF CACHE BOOL "Build img2webp")
set(WEBP_BUILD_VWEBP OFF CACHE BOOL "Build vwebp")
set(WEBP_BUILD_WEBPINFO OFF CACHE BOOL "Build webpinfo")
set(WEBP_BUILD_WEBPMUX OFF CACHE BOOL "Build webpmux")
set(WEBP_BUILD_EXTRAS OFF CACHE BOOL "Build extras")

add_subdirectory(libwebp)

# ────────────────────────────────────────────────────────────────────────────
# Build magic-webp WASM module
# ────────────────────────────────────────────────────────────────────────────

add_executable(magic_webp
    src-c/magic_webp.c
    src-c/animation.c
    src-c/gifdec_stb.c
    # imageio sources for format conversion
    libwebp/imageio/image_dec.c
    libwebp/imageio/jpegdec.c
    libwebp/imageio/metadata.c
    libwebp/imageio/pngdec.c
    libwebp/imageio/pnmdec.c
    libwebp/imageio/tiffdec.c
    libwebp/imageio/webpdec.c
    libwebp/imageio/wicdec.c
    libwebp/imageio/imageio_util.c
)

target_include_directories(magic_webp PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/libwebp/src
    ${CMAKE_CURRENT_SOURCE_DIR}/libwebp
)

target_link_libraries(magic_webp
    webp
    webpdemux
    libwebpmux
)

# ────────────────────────────────────────────────────────────────────────────
# Emscripten settings
# ────────────────────────────────────────────────────────────────────────────

set(EMSCRIPTEN_FLAGS
    -O3
    -sWASM=1
    -sEXPORT_ES6=1
    -sMODULARIZE=1
    -sEXPORT_NAME=createMagicWebpModule
    -sEXPORTED_FUNCTIONS=['_malloc','_free','_magic_webp_crop','_magic_webp_resize','_magic_webp_resize_fit','_magic_webp_resize_cover','_magic_webp_convert_to_webp','_magic_webp_free','_magic_webp_get_error']
    -sEXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','getValue','setValue','writeArrayToMemory']
    -sALLOW_MEMORY_GROWTH=1
    -sINITIAL_MEMORY=33554432
    -sMAXIMUM_MEMORY=2147483648
    -sSTACK_SIZE=5242880
    -sENVIRONMENT=web,worker
    -sNO_FILESYSTEM=1
    -sMODULARIZE=1
    -sIMPORTED_MEMORY=0
    -sSINGLE_FILE=1
    --no-entry
    # Image format support via Emscripten ports
    -sUSE_LIBPNG=1
    -sUSE_LIBJPEG=1
)

string(REPLACE ";" " " EMSCRIPTEN_FLAGS_STR "${EMSCRIPTEN_FLAGS}")
set_target_properties(magic_webp PROPERTIES
    LINK_FLAGS "${EMSCRIPTEN_FLAGS_STR}"
    SUFFIX ".mjs"
    OUTPUT_NAME "magic_webp"
)

# ────────────────────────────────────────────────────────────────────────────
# Output to pkg directory
# ────────────────────────────────────────────────────────────────────────────

set_target_properties(magic_webp PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/lib"
)

