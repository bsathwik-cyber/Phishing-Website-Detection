@echo off
title PhishGuard Backend
echo Starting Flask Server...
cd /d "%~dp0backend"

if exist "venv\Scripts\python.exe" (
    venv\Scripts\python.exe app.py
) else (
    echo Backend virtual environment not found.
    echo Create it with: py -3.11 -m venv venv
    echo Then install dependencies with: pip install -r requirements.txt
    pause
    exit /b 1
)

pause
