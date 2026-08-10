@echo off
title PhishGuard Launcher
echo ======================================================================
echo   PHISHGUARD FULL-STACK MACHINE LEARNING PLATFORM LAUNCHER
echo ======================================================================
echo.

:: 1. Launch Python Flask Backend
echo [1/3] Launching Flask Backend Server...
start run_backend.bat

:: 2. Launch Next.js Frontend
echo [2/3] Launching Next.js Frontend Server...
start run_frontend.bat

:: 3. Wait for servers to initialize
echo [3/3] Waiting for servers to initialize (5 seconds)...
ping 127.0.0.1 -n 6 >nul

echo.
echo Opening browser to http://localhost:3000...
start http://localhost:3000

echo.
echo ======================================================================
echo   PhishGuard is active!
echo   - Backend Service: http://127.0.0.1:5001
echo   - Frontend Portal: http://localhost:3000
echo ======================================================================
echo.
exit
