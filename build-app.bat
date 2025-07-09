@echo off
echo Building the app...
call npm run build
echo Checking if build exists...
if not exist "build\index.html" (
    echo ERROR: Build failed! build\index.html not found.
    pause
    exit /b 1
)
echo Starting Electron...
call npx electron .
pause