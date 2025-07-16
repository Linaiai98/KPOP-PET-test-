@echo off
title Setup Relay Server

echo.
echo ==========================================
echo    Virtual Pet Relay Server Setup
echo ==========================================
echo.

:: Check Node.js
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

:: Install dependencies
echo [2/4] Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Installation failed!
    echo.
    echo Try these solutions:
    echo 1. Check internet connection
    echo 2. Run: npm cache clean --force
    echo 3. Run: npm install --verbose
    echo.
    pause
    exit /b 1
)

echo [OK] Dependencies installed
echo.

:: Test installation
echo [3/4] Testing installation...
node -e "console.log('Node.js works!')"
if %errorlevel% neq 0 (
    echo [ERROR] Node.js test failed
    pause
    exit /b 1
)

echo [OK] Installation test passed
echo.

:: Show completion message
echo [4/4] Setup completed successfully!
echo.
echo ==========================================
echo           SETUP COMPLETE!
echo ==========================================
echo.
echo Next steps:
echo   1. Run: start.bat (recommended)
echo   2. Or run: npm start
echo   3. Open: http://localhost:3000
echo.
echo Available commands:
echo   npm start      - Start server
echo   npm test       - Run tests
echo   npm run diagnose - Check system
echo.
echo Server addresses:
echo   Local:    http://localhost:3000
echo   External: http://154.12.38.33:3000
echo.
pause
