cmake_minimum_required(VERSION 3.14)
project(hypermath VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files
set(SOURCES
    src/main.cpp
    src/gyrovector.cpp
    src/hyperbolic.cpp
)

# Create the WASM module
add_executable(hypermath ${SOURCES})

# Include directories
target_include_directories(hypermath PRIVATE src)

# Emscripten-specific settings
if(EMSCRIPTEN)
    set_target_properties(hypermath PROPERTIES
        SUFFIX ".js"
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../public/wasm"
    )

    # Emscripten link flags
    target_link_options(hypermath PRIVATE
        # ES6 module output
        -sMODULARIZE=1
        -sEXPORT_ES6=1
        -sEXPORT_NAME=createHyperMathModule

        # Memory settings
        -sALLOW_MEMORY_GROWTH=1
        -sINITIAL_MEMORY=16777216  # 16MB

        # Embind for C++ bindings
        --bind

        # Environment
        -sENVIRONMENT=web

        # Optimize
        -O3

        # Export filesystem (disabled for now)
        -sNO_FILESYSTEM=1

        # Single file output (embed wasm in js)
        # -sSINGLE_FILE=1  # Uncomment if you want single file
    )

    # Compiler flags
    target_compile_options(hypermath PRIVATE
        -O3
        -ffast-math
    )
endif()
