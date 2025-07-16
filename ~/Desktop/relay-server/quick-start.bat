@echo off
title Quick Start Relay Server

:: Quick check and start
echo Starting Virtual Pet Relay Server...
echo.

:: Check if Node.js exists
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Start server
echo.
echo Server starting at:
echo - Local:    http://localhost:3000
echo - External: http://154.12.38.33:3000
echo.
echo Press Ctrl+C to stop the server
echo.

:: Open browser and start server
start "" "http://localhost:3000"
npm start

pause
