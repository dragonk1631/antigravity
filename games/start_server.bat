@echo off
echo Starting Local Game Server...
echo.
echo If asked to install 'http-server', type 'y' and press Enter.
echo.
call npx live-server --port=8080 --entry-file=index.html
pause
