@echo off
title HoloEngine Monitor
echo ============================================
echo   HoloEngine Full-Stack Monitor Server
echo ============================================
echo.

REM Убиваем ВСЕ процессы на порту 3001
set "KILLED=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
  echo [OK] Убиваем PID %%a на порту 3001
  taskkill /F /PID %%a >nul 2>&1
  set "KILLED=1"
)
if !KILLED!==0 echo [INFO] Порт 3001 свободен
echo.

REM Даём время на освобождение порта
timeout /t 2 >nul

REM Запускаем сервер в фоне
echo Запуск сервера...
start /min cmd /c "node "%~dp0scripts\monitor-server.js""

REM Ждём пока сервер запустится
timeout /t 3 >nul

REM Открываем в режиме приложения (без панелей, вкладок)
echo Открытие монитора...
start msedge --app=http://localhost:3001 --no-first-run

echo.
echo ✅ Монитор запущен в фоне!
echo 🌐 Страница открыта в режиме приложения
echo.
echo Для остановки: закройте окно Edge ИЛИ нажмите Ctrl+C
echo.
