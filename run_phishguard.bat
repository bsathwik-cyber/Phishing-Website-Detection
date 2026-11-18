@echo off
setlocal EnableExtensions
title PhishGuard - Start All Services

echo ============================================================
echo PHISHGUARD - FIRST-RUN SETUP AND STARTUP
echo ============================================================
echo.
echo Prerequisites:
echo   - Python 3.10 or newer (Python 3.11 recommended)
echo   - Node.js 20.9 or newer, including npm
echo.
echo This launcher creates the Python virtual environment, installs
echo missing dependencies, trains the model if needed, and installs
echo the frontend packages on the first run.
echo.

if not exist "%~dp0backend\app.py" (
    echo [ERROR] backend\app.py was not found.
    echo Extract the complete PhishGuard ZIP folder before running this file.
    pause
    exit /b 1
)

if not exist "%~dp0frontend\package.json" (
    echo [ERROR] frontend\package.json was not found.
    echo Extract the complete PhishGuard ZIP folder before running this file.
    pause
    exit /b 1
)

echo Opening backend setup in a new window...
start "PhishGuard Backend" "%ComSpec%" /k ""%~dp0run_backend.bat""

echo Opening frontend setup in a new window...
start "PhishGuard Frontend" "%ComSpec%" /k ""%~dp0run_frontend.bat""

echo.
echo Waiting for both services. First-time dependency installation and
echo model training can take several minutes.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wait_for_services.ps1"

if errorlevel 1 (
    echo.
    echo Startup was not confirmed. Check both service windows for errors.
    echo Once both services are running, open http://localhost:3000 manually.
    pause
    exit /b 1
)

echo.
echo PhishGuard is running:
echo   Frontend: http://localhost:3000
echo   Backend:  http://127.0.0.1:5001
echo.
echo Keep both service windows open.
echo Close those windows or press Ctrl+C in them to stop the services.
echo.
pause
endlocal
