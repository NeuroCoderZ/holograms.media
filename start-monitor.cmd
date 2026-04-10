@echo off
title HoloEngine Monitor
echo ============================================
echo   HoloEngine Full-Stack Monitor Server
echo ============================================
echo.

REM Убиваем процесс на порту 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
  echo [OK] Убиваем процесс PID %%a на порту 3001
  taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Запуск сервера на http://localhost:3001...
echo.

node "%~dp0scripts\monitor-server.js"
pause
