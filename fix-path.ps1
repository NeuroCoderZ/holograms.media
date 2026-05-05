# Fix Windows PATH and Python conflicts
Write-Host "=== CLEANING SYSTEM PATH ===" -ForegroundColor Cyan

# Get current PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathEntries = $currentPath -split ';'

# Remove duplicates and problematic entries
$cleanedPath = $pathEntries | Where-Object {
    $_ -and 
    $_ -notmatch 'WindowsApps\\python' -and  # Remove Windows Store Python
    $_ -notmatch 'Python311'  # Remove old Python 3.11
} | Select-Object -Unique

# Rebuild PATH
$newPath = $cleanedPath -join ';'

Write-Host "`nCurrent PATH entries:" -ForegroundColor Yellow
$pathEntries | ForEach-Object { Write-Host "  $_" }

Write-Host "`nCleaned PATH entries:" -ForegroundColor Green
$cleanedPath | ForEach-Object { Write-Host "  $_" }

Write-Host "`n[ACTION REQUIRED]" -ForegroundColor Red
Write-Host "To apply changes, run as Administrator:" -ForegroundColor Yellow
Write-Host '[Environment]::SetEnvironmentVariable("Path", $newPath, "User")' -ForegroundColor White

Write-Host "`nPython installations found:" -ForegroundColor Cyan
Get-Command python -All | Select-Object Source

Write-Host "`nRecommendation:" -ForegroundColor Yellow
Write-Host "1. Keep only Python 3.12 (C:\Users\neorh\AppData\Local\Programs\Python\Python312)"
Write-Host "2. Remove Python 3.11 via Control Panel"
Write-Host "3. Remove scoop Python if not needed"
Write-Host "4. Restart VS Code after changes"
