@echo off
title Virtual Pet Relay Server - Install

echo.
echo ========================================
echo    Virtual Pet Relay Server Install
echo ========================================
echo.

:: Check Node.js installation
echo [INFO] Checking Node.js environment...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found
    echo.
    echo [SOLUTION] Please install Node.js first:
    echo    1. Visit https://nodejs.org/
    echo    2. Download LTS version
    echo    3. Install and run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js version:
node --version

echo [OK] npm version:
npm --version
echo.

:: Install dependencies
echo [INFO] Installing project dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Dependencies installation failed
    echo.
    echo [SOLUTIONS]:
    echo    1. Check network connection
    echo    2. Clear npm cache: npm cache clean --force
    echo    3. Use China mirror: npm config set registry https://registry.npmmirror.com
    echo.
    pause
    exit /b 1
)

echo [OK] Dependencies installed successfully
echo.

:: Skip automatic testing to avoid encoding issues
echo [INFO] Installation completed successfully!
echo.
echo [NEXT STEPS]:
echo    1. Run: npm start
echo    2. Or double-click: start.bat
echo    3. Test server: npm test
echo    4. Diagnose issues: npm run diagnose
echo.
echo [SERVER ADDRESSES]:
echo    Local:    http://localhost:3000
echo    External: http://154.12.38.33:3000
echo.
echo [DOCUMENTATION]: See README.md for detailed instructions
echo.
pause
