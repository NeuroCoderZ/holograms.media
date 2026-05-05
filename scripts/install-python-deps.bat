@echo off
REM Install Python dependencies for NeuroEscrow backend

echo.
echo ========================================
echo   Installing Python Dependencies
echo ========================================
echo.

cd /d "%~dp0..\neuroescrow\backend"

echo Installing from requirements.txt...
pip install -q astrapy mistralai pydantic httpx python-telegram-bot python-dotenv

if errorlevel 1 (
    echo.
    echo ERROR: Installation failed
    echo Try running: pip install --user astrapy mistralai pydantic httpx python-telegram-bot python-dotenv
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo You can now run:
echo   - python scripts\index.py
echo   - python scripts\index_incremental.py
echo   - python scripts\quick_update.py
echo.

pause
