@echo off
title PhishGuard Backend
echo Starting Flask Server...
cd /d "%~dp0backend"
venv\Scripts\python app.py
pause
