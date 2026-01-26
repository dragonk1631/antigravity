@echo off
echo Starting SkyDash Local Server...
echo.
echo This requires Node.js installed.
echo If first time, it might ask to install http-server.
echo.
start "" "http://localhost:8080"
npx http-server -c-1 --cors
pause
