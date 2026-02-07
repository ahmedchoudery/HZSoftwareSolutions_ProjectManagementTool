@echo off
echo Starting HZ Project Management Tool...
echo.
echo Step 0: Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
echo.
echo Step 1: Starting Backend Server...
cd server
start "HZ Backend Server" npm start
echo Server started in a new window.
echo.
echo Step 2: Opening Application in Browser...
timeout /t 5
start http://localhost:5000
echo.
echo Done! You can close this window, but keep the "HZ Backend Server" window open.
pause
