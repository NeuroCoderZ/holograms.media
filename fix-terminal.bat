@echo off
echo === FIXING VS CODE TERMINAL ISSUES ===
echo.

echo [1/5] Checking Python installations...
where python
echo.

echo [2/5] Testing pip install (small package)...
pip install --upgrade pip --quiet
echo.

echo [3/5] Clearing pip cache...
pip cache purge
echo.

echo [4/5] Testing command with long output...
pip list
echo.

echo [5/5] Checking VS Code processes...
tasklist | findstr "Code"
echo.

echo === DIAGNOSTICS COMPLETE ===
pause
