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

powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddMinutes(10); while ((Get-Date) -lt $deadline) { $backend = New-Object System.Net.Sockets.TcpClient; $frontend = New-Object System.Net.Sockets.TcpClient; $backendReady = $false; $frontendReady = $false; try { $backend.Connect('127.0.0.1', 5001); $backendReady = $true } catch {} finally { $backend.Dispose() }; try { $frontend.Connect('127.0.0.1', 3000); $frontendReady = $true } catch {} finally { $frontend.Dispose() }; if ($backendReady -and $frontendReady) { Start-Process 'http://localhost:3000'; Write-Host 'Both services are responding. Opened PhishGuard in your browser.'; exit 0 }; Start-Sleep -Seconds 2 }; Write-Host 'Startup was not confirmed within 10 minutes. Check the Backend and Frontend windows for the specific error.'; exit 1"

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
