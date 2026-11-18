@echo off
setlocal EnableExtensions
title PhishGuard Backend

echo ============================================================
echo PHISHGUARD - BACKEND FIRST-RUN SETUP
echo ============================================================
echo.

cd /d "%~dp0backend"
if errorlevel 1 (
    echo [ERROR] Could not find the backend folder.
    pause
    exit /b 1
)

:: Prefer Python 3.11 when the Windows Python Launcher is available.
set "PYTHON_LAUNCHER="
where py >nul 2>nul
if not errorlevel 1 (
    py -3.11 --version >nul 2>nul
    if not errorlevel 1 set "PYTHON_LAUNCHER=py -3.11"
)

:: Fall back to the python command on PATH if py -3.11 is not installed.
if not defined PYTHON_LAUNCHER (
    where python >nul 2>nul
    if not errorlevel 1 (
        python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
        if not errorlevel 1 set "PYTHON_LAUNCHER=python"
    )
)

:: As a final option, use the Python Launcher's default interpreter.
if not defined PYTHON_LAUNCHER (
    where py >nul 2>nul
    if not errorlevel 1 (
        py -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
        if not errorlevel 1 set "PYTHON_LAUNCHER=py"
    )
)

if not defined PYTHON_LAUNCHER (
    echo [ERROR] Python 3.10 or newer was not found.
    echo Install Python 3.11 from https://www.python.org/downloads/
    echo Enable the Python Launcher or add Python to PATH during installation.
    pause
    exit /b 1
)

:: Create the project-specific virtual environment on first run.
if not exist "venv\Scripts\python.exe" (
    echo [1/4] Creating Python virtual environment...
    %PYTHON_LAUNCHER% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Could not create the virtual environment.
        echo Check your Python installation and folder permissions.
        pause
        exit /b 1
    )
) else (
    echo [1/4] Python virtual environment already exists.
)

set "VENV_PYTHON=%CD%\venv\Scripts\python.exe"

:: Install the backend dependencies only when one or more required packages are missing.
"%VENV_PYTHON%" -c "import flask, flask_cors, flask_limiter, pandas, numpy, sklearn, werkzeug" >nul 2>nul
if errorlevel 1 (
    echo [2/4] Installing Python dependencies. This may take a few minutes...
    "%VENV_PYTHON%" -m pip install --upgrade pip
    if errorlevel 1 (
        echo [ERROR] Could not upgrade pip. Check your internet connection.
        pause
        exit /b 1
    )

    "%VENV_PYTHON%" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Backend dependency installation failed.
        echo Check your internet connection and Python version, then run this file again.
        pause
        exit /b 1
    )
) else (
    echo [2/4] Backend dependencies are already installed.
)

:: Retrain when artifacts are missing or were created by the previous metrics format.
if not exist "model" mkdir "model"
set "MODEL_READY="

if exist "model\phishing_model.pkl" if exist "model\model_metrics.json" (
    "%VENV_PYTHON%" -c "import json,sys; d=json.load(open('model/model_metrics.json', encoding='utf-8')); sys.exit(0 if d.get('status') == 'available' and d.get('feature_names') else 1)" >nul 2>nul
    if not errorlevel 1 set "MODEL_READY=1"
)

if not defined MODEL_READY (
    echo [3/4] Training the Random Forest model for this computer...
    echo The first training run can take several minutes.
    "%VENV_PYTHON%" train_model.py
    if errorlevel 1 (
        echo [ERROR] Model training failed. Read the Python error above.
        pause
        exit /b 1
    )
) else (
    echo [3/4] A compatible trained model was found.
)

echo.
echo [4/4] Starting the Flask API at http://127.0.0.1:5001
echo Keep this window open while using PhishGuard.
echo Press Ctrl+C to stop the backend.
echo.
"%VENV_PYTHON%" app.py

if errorlevel 1 (
    echo.
    echo [ERROR] The Flask backend stopped with an error.
    pause
    exit /b 1
)

endlocal
