@echo off
title PhishGuard Frontend
echo Configuring portable Node.js and starting Dev Server...
set PATH=%~dp0..\node-bin;%PATH%
cd /d "%~dp0frontend"
npm run dev
pause
