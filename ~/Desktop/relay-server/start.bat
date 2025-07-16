@echo off
title Virtual Pet Relay Server

echo.
echo ========================================
echo    Virtual Pet Relay Server Startup
echo ========================================
echo.

:: Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found
    echo [SOLUTION] Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js version:
node --version
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] First run, installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Dependencies installation failed
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully
    echo.
)

:: Start server
echo [INFO] Starting relay server...
echo [LOCAL]    http://localhost:3000
echo [EXTERNAL] http://154.12.38.33:3000
echo.
echo [TIP] Press Ctrl+C to stop the server
echo ========================================
echo.

:: Start server and open management page in browser
start "" "http://localhost:3000"
npm start

pause
