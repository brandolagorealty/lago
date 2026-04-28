@echo off
echo Starting Tailwind CSS watcher and Vite dev server...
echo.

REM Start Tailwind CLI in background
start "Tailwind CSS" /MIN cmd /c ".\tailwindcss.exe -i ./tailwind.css -o ./index.css --watch"

REM Wait a moment for initial CSS build
timeout /t 3 /nobreak > nul

REM Start Vite dev server in foreground
npx vite
