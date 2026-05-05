# AUTOMATED SYSTEM CLEANUP AND OPTIMIZATION
# Run as Administrator

Write-Host "=== SYSTEM OPTIMIZATION STARTED ===" -ForegroundColor Cyan

# 1. CLEAN PATH
Write-Host "`n[1/8] Cleaning PATH..." -ForegroundColor Yellow
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$cleanPath = ($currentPath -split ';' | Where-Object {
    $_ -and 
    $_ -notmatch 'Python311' -and
    $_ -notmatch 'WindowsApps\\python'
} | Select-Object -Unique | Where-Object { $_.Trim() -ne '' }) -join ';'

[Environment]::SetEnvironmentVariable("Path", $cleanPath, "User")
Write-Host "✓ PATH cleaned (removed Python 3.11 and WindowsApps Python)" -ForegroundColor Green

# 2. UPDATE WINDOWS
Write-Host "`n[2/8] Checking Windows Updates..." -ForegroundColor Yellow
try {
    Install-Module PSWindowsUpdate -Force -SkipPublisherCheck -ErrorAction SilentlyContinue
    Import-Module PSWindowsUpdate -ErrorAction SilentlyContinue
    Write-Host "✓ Windows Update module ready" -ForegroundColor Green
    Write-Host "  Run 'Get-WindowsUpdate' and 'Install-WindowsUpdate' manually" -ForegroundColor Gray
} catch {
    Write-Host "⚠ Install updates via Settings > Windows Update" -ForegroundColor Yellow
}

# 3. UPDATE PYTHON
Write-Host "`n[3/8] Updating Python packages..." -ForegroundColor Yellow
& "C:\Users\neorh\AppData\Local\Programs\Python\Python312\python.exe" -m pip install --upgrade pip setuptools wheel --quiet
Write-Host "✓ Python core packages updated" -ForegroundColor Green

# 4. UPDATE NODE/NPM
Write-Host "`n[4/8] Updating Node.js packages..." -ForegroundColor Yellow
npm install -g npm@latest 2>$null
Write-Host "✓ npm updated" -ForegroundColor Green

# 5. UPDATE SCOOP
Write-Host "`n[5/8] Updating Scoop packages..." -ForegroundColor Yellow
scoop update 2>$null
scoop update * 2>$null
Write-Host "✓ Scoop packages updated" -ForegroundColor Green

# 6. CLEAN TEMP FILES
Write-Host "`n[6/8] Cleaning temporary files..." -ForegroundColor Yellow
Remove-Item "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✓ Temp files cleaned" -ForegroundColor Green

# 7. CLEAN PIP CACHE
Write-Host "`n[7/8] Cleaning pip cache..." -ForegroundColor Yellow
& "C:\Users\neorh\AppData\Local\Programs\Python\Python312\python.exe" -m pip cache purge
Write-Host "✓ pip cache cleared" -ForegroundColor Green

# 8. CLEAN NPM CACHE
Write-Host "`n[8/8] Cleaning npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>$null
Write-Host "✓ npm cache cleared" -ForegroundColor Green

# SUMMARY
Write-Host "`n=== OPTIMIZATION COMPLETE ===" -ForegroundColor Green
Write-Host "`nMANUAL STEPS REQUIRED:" -ForegroundColor Yellow
Write-Host "1. Uninstall Python 3.11:" -ForegroundColor White
Write-Host "   Settings > Apps > Python 3.11 > Uninstall" -ForegroundColor Gray
Write-Host "`n2. Remove Windows Store Python alias:" -ForegroundColor White
Write-Host "   Settings > Apps > App execution aliases > Disable Python" -ForegroundColor Gray
Write-Host "`n3. Update Windows:" -ForegroundColor White
Write-Host "   Settings > Windows Update > Check for updates" -ForegroundColor Gray
Write-Host "`n4. Restart computer" -ForegroundColor White
Write-Host "`n5. After restart, verify:" -ForegroundColor White
Write-Host "   python --version  # Should show 3.12.10" -ForegroundColor Gray
Write-Host "   where python      # Should show only 1-2 paths" -ForegroundColor Gray

Write-Host "`nPress any key to open Settings..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "ms-settings:appsfeatures"
