@echo off
title PhishGuard Frontend
echo Starting Next.js development server...

:: Use the optional portable Node folder only when it exists.
if exist "%~dp0..\node-bin\npm.cmd" (
    set "PATH=%~dp0..\node-bin;%PATH%"
)

where npm >nul 2>nul
if errorlevel 1 (
    echo npm was not found. Install Node.js 20.9 or newer, then reopen this terminal.
    pause
    exit /b 1
)

cd /d "%~dp0frontend"
npm run dev
pause
