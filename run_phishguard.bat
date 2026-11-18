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

:: Verify system runtimes before opening the service windows.
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or is not available on PATH.
    echo Install Node.js 20.9 or newer from https://nodejs.org/
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
    echo [ERROR] Node.js 20.9 or newer is required by this Next.js project.
    node --version
    echo Download a supported version from https://nodejs.org/
    pause
    exit /b 1
)

set "PYTHON_LAUNCHER="
where py >nul 2>nul
if not errorlevel 1 (
    py -3.11 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
    if not errorlevel 1 set "PYTHON_LAUNCHER=py -3.11"
)

if not defined PYTHON_LAUNCHER (
    where python >nul 2>nul
    if not errorlevel 1 (
        python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
        if not errorlevel 1 set "PYTHON_LAUNCHER=python"
    )
)

if not defined PYTHON_LAUNCHER (
    echo [ERROR] Python 3.10 or newer was not found.
    echo Install Python 3.11 from https://www.python.org/downloads/
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
