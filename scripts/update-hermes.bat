@echo off
REM Quick Hermes Context Update
REM Usage: update-hermes.bat

echo.
echo ========================================
echo   Quick Hermes Context Update
echo ========================================
echo.

cd /d "%~dp0..\neuroescrow\backend"

echo Step 1: Generating fresh repomix context...
cd ..
call npx repomix
if errorlevel 1 (
    echo ERROR: RepoMix failed
    exit /b 1
)
echo    OK: repomix-output.md updated
echo.

echo Step 2: Updating changed files in AstraDB...
cd backend
python scripts\index_incremental.py
if errorlevel 1 (
    echo ERROR: Indexing failed
    exit /b 1
)
echo    OK: Hermes context updated
echo.

echo ========================================
echo   Done! Hermes has fresh context.
echo ========================================
echo.
echo Test: curl https://YOUR_WORKER.workers.dev/health
echo.

pause
