# Emscripten Cifa Playground Makefile

EMCC = emcc
CFLAGS = -O3 -std=c++17 -I../../
LDFLAGS = -s WASM=1 \
          -s EXPORT_ES6=1 \
          -s MODULARIZE=1 \
          -s EXPORT_NAME="CifaModule" \
          -s ALLOW_MEMORY_GROWTH=1 \
          -s INITIAL_MEMORY=32MB \
          -s MAXIMUM_MEMORY=256MB \
          -s STACK_SIZE=8MB \
          --bind

# 目标输出到 web 目录
TARGET_DIR = ../web
TARGET_JS = $(TARGET_DIR)/cifa.js
TARGET_WASM = $(TARGET_DIR)/cifa.wasm

# 源文件
SOURCES = cifa_wrapper.cpp ../../Cifa.cpp

.PHONY: all clean

all: $(TARGET_JS)

$(TARGET_JS): $(SOURCES) ../../Cifa.h
	$(EMCC) $(CFLAGS) $(LDFLAGS) -o $@ $(SOURCES)

clean:
	rm -f $(TARGET_JS) $(TARGET_WASM)

# 开发模式（带调试信息）
debug:
	$(EMCC) -g -O0 -std=c++17 -I../../ $(LDFLAGS) -s ASSERTIONS=1 -o $(TARGET_JS) $(SOURCES)