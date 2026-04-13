@echo off
title HoloEngine Monitor
echo ============================================
echo   HoloEngine Full-Stack Monitor — Kiosk Mode
echo ============================================
echo.

REM Убиваем ВСЕ процессы на порту 3001
set "KILLED=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
  echo [OK] Убиваем PID %%a на порту 3001
  taskkill /F /PID %%a >nul 2>&1
  set "KILLED=1"
)
if %KILLED%==0 echo [INFO] Порт 3001 свободен
echo.

REM Даём время на освобождение порта
timeout /t 2 >nul

echo Запуск сервера...
start /min cmd /c "node "%~dp0scripts\monitor-server.js""

REM Ждём пока сервер запустится
timeout /t 4 >nul

echo Открытие монитора в режиме приложения...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3001 --disable-extensions --disable-background-timer-throttling

echo.
echo ✅ Монитор запущен!
echo 📡 Страница открыта БЕЗ панелей браузера
echo.
echo Окно сервера свёрнуто. Для остановки — закрой Chrome.
timeout /t 2 >nul
exit
