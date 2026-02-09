@echo off
setlocal
title HZ Project Management Tool - Starter

echo ===================================================
echo    HZ Software Solutions - Project Management Tool
echo ===================================================
echo.
echo [1/3] Closing any old sessions...
taskkill /F /IM node.exe >nul 2>&1

echo [2/3] Starting the Cloud-Connected Server...
cd /d "%~dp0server"
start "HZ Backend (DO NOT CLOSE)" cmd /c "npm start"

echo [3/3] Waiting for server to wake up...
timeout /t 3 /nobreak >nul

echo.
echo Launching your website...
start http://localhost:5000

echo.
echo 🎉 Success! Your website is now open.
echo 💡 Tip: Keep the other black window open while using the site.
echo.
timeout /t 5
exit
