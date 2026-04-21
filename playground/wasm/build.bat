@echo off
setlocal enabledelayedexpansion

:: --- 配置变量 (对应 Makefile 变量) ---
set EMCC=emcc
set CFLAGS=-O3 -std=c++20 -I../../
set LDFLAGS=-s WASM=1 -s EXPORT_ES6=1 -s MODULARIZE=1 -s EXPORT_NAME="CifaModule" -s ALLOW_MEMORY_GROWTH=1 -s INITIAL_MEMORY=32MB -s MAXIMUM_MEMORY=256MB -s STACK_SIZE=8MB --bind

set TARGET_DIR=..\web
set TARGET_JS=%TARGET_DIR%\cifa.js
set TARGET_WASM=%TARGET_DIR%\cifa.wasm

set SOURCES=cifa_wrapper.cpp ..\..\Cifa.cpp

:: --- 逻辑入口 ---
set ACTION=%1
if "%ACTION%"=="" goto all
if /I "%ACTION%"=="all" goto all
if /I "%ACTION%"=="clean" goto clean
if /I "%ACTION%"=="debug" goto debug

echo Unknown target: %ACTION%
echo Usage: build.bat [all^|clean^|debug]
exit /b 1

:: --- Target: all ---
:all
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
echo Building target: %TARGET_JS%...

%EMCC% %CFLAGS% %LDFLAGS% -o "%TARGET_JS%" %SOURCES%

if %ERRORLEVEL% equ 0 (
    echo Build successful.
) else (
    echo Build failed with error %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
goto :eof

:: --- Target: clean ---
:clean
echo Cleaning artifacts...
if exist "%TARGET_JS%" del /f /q "%TARGET_JS%"
if exist "%TARGET_WASM%" del /f /q "%TARGET_WASM%"
echo Clean complete.
goto :eof

:: --- Target: debug ---
:debug
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
echo Building debug version...

%EMCC% -g -O0 -std=c++17 -I../../ %LDFLAGS% -s ASSERTIONS=1 -o "%TARGET_JS%" %SOURCES%

if %ERRORLEVEL% equ 0 (
    echo Debug build successful.
) else (
    echo Debug build failed.
    exit /b %ERRORLEVEL%
)
goto :eof