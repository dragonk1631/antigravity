@echo off
echo Closing any running node processes...
taskkill /f /im node.exe

echo.
echo Deleting node_modules (this may take a while)...
rmdir /s /q node_modules
del package-lock.json

echo.
echo Re-installing dependencies...
call npm install

echo.
echo Starting server with fresh cleaner cache...
npm run dev -- --force
pause
