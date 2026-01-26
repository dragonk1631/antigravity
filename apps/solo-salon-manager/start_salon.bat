@echo off
cd /d "%~dp0"
echo Starting Beauty Solo Assistant (Solo Salon Manager)...
echo Directory: %~dp0

echo Running npm run dev...
npm run dev -- --force

IF %ERRORLEVEL% NEQ 0 (
    echo Error: npm run dev failed. Please check if node_modules are installed.
    pause
    exit /b
)

pause
