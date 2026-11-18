@echo off
setlocal EnableExtensions
title PhishGuard Frontend

echo ============================================================
echo PHISHGUARD - FRONTEND FIRST-RUN SETUP
echo ============================================================
echo.

cd /d "%~dp0frontend"
if errorlevel 1 (
    echo [ERROR] Could not find the frontend folder.
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js was not found.
    echo Install Node.js 20.9 or newer from https://nodejs.org/
    echo Then close and reopen this window.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found. Reinstall Node.js with npm included.
    pause
    exit /b 1
)

node -e "const v=process.versions.node.split('.').map(Number); process.exit(v[0] > 20 || (v[0] === 20 && v[1] >= 9) ? 0 : 1)" >nul 2>nul
if errorlevel 1 (
    echo [ERROR] This project requires Node.js 20.9 or newer.
    echo Your installed Node.js version is:
    node --version
    echo Download a supported version from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js:
node --version
echo npm:
npm --version
echo.

:: Install the exact versions recorded in package-lock.json on first run.
if not exist "node_modules\.bin\next.cmd" (
    echo Installing frontend dependencies with npm ci.
    echo This may take a few minutes on the first run...
    if exist "package-lock.json" (
        call npm ci
    ) else (
        call npm install
    )

    if errorlevel 1 (
        echo [ERROR] Frontend dependency installation failed.
        echo Check your internet connection and Node.js version, then run this file again.
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies are already installed.
)

echo.
echo Starting Next.js at http://127.0.0.1:3000
echo Keep this window open while using PhishGuard.
echo Press Ctrl+C to stop the frontend.
echo.
call npm run dev -- --hostname 127.0.0.1 --port 3000

if errorlevel 1 (
    echo.
    echo [ERROR] The Next.js development server stopped with an error.
    pause
    exit /b 1
)

endlocal
