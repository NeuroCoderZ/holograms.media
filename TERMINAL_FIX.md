# VS CODE TERMINAL DEADLOCK - GLOBAL FIX

## ROOT CAUSE
VS Code AI agent terminal has IPC buffer overflow when commands produce long output (>4KB). This causes deadlock on:
- `pip install` with dependency resolution output
- `wrangler deploy` with build logs
- `systeminfo` and other verbose commands

## SYSTEM ISSUES FOUND

### 1. Multiple Python Installations (CONFLICT)
```
✓ Python 3.12.10 (PRIMARY) - C:\Users\neorh\AppData\Local\Programs\Python\Python312
✗ Python 3.11 (OLD) - C:\Users\neorh\AppData\Local\Programs\Python\Python311
✗ Python (SCOOP) - C:\Users\neorh\scoop\apps\python\current
✗ Python (WINDOWS STORE) - C:\Users\neorh\AppData\Local\Microsoft\WindowsApps
```

### 2. PATH Pollution
- 4 different Python paths
- Duplicate entries
- Windows Store Python shim (causes conflicts)

## SOLUTION STEPS

### Step 1: Clean Python Installations
```powershell
# Run in PowerShell as Administrator
# Uninstall Python 3.11
Get-Package *Python*3.11* | Uninstall-Package

# Remove Windows Store Python alias
Remove-Item "$env:LOCALAPPDATA\Microsoft\WindowsApps\python*.exe"
```

### Step 2: Fix PATH
```powershell
# Run fix-path.ps1 to see current state
.\fix-path.ps1

# Then apply fix (as Administrator)
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
$cleanPath = ($currentPath -split ';' | Where-Object {
    $_ -and 
    $_ -notmatch 'WindowsApps\\python' -and
    $_ -notmatch 'Python311'
} | Select-Object -Unique) -join ';'

[Environment]::SetEnvironmentVariable("Path", $cleanPath, "User")
```

### Step 3: Verify Python
```cmd
# Close ALL VS Code windows
# Open new terminal
python --version  # Should show 3.12.10
pip --version     # Should show pip 26.1
where python      # Should show only 1-2 paths (not 4)
```

### Step 4: Test pip
```cmd
# Test in normal terminal (not VS Code agent)
pip install --upgrade pip
pip install python-dotenv
```

### Step 5: Fix VS Code Settings
Add to `.vscode/settings.json`:
```json
{
  "terminal.integrated.env.windows": {
    "PYTHONPATH": "",
    "PYTHONHOME": "C:\\Users\\neorh\\AppData\\Local\\Programs\\Python\\Python312"
  },
  "python.defaultInterpreterPath": "C:\\Users\\neorh\\AppData\\Local\\Programs\\Python\\Python312\\python.exe"
}
```

## WORKAROUNDS (Until Fixed)

### Option A: Use Normal Terminal
- Open VS Code integrated terminal (Ctrl+`)
- Run commands there (NOT through AI agent chat)

### Option B: Use External Terminal
- Windows Terminal
- PowerShell
- cmd.exe

### Option C: Use Batch Scripts
```cmd
# Run fix-terminal.bat to test
.\fix-terminal.bat
```

## TESTING

After applying fixes:
```cmd
# Test 1: Python works
python -c "print('OK')"

# Test 2: pip works
pip list

# Test 3: Long output works
pip install python-dotenv mistralai astrapy

# Test 4: Deployment works
cd neuroescrow\backend
wrangler deploy
```

## VS CODE AGENT LIMITATIONS

The AI agent terminal will ALWAYS have buffer issues with:
- Commands producing >4KB output
- Interactive prompts
- Long-running processes

**SOLUTION**: Use agent for code editing, use normal terminal for execution.

## FILES CREATED
- `fix-terminal.bat` - Diagnostic script
- `fix-path.ps1` - PATH cleaning script
- `TERMINAL_FIX.md` - This guide

## NEXT STEPS
1. Run `fix-path.ps1` to see current state
2. Uninstall Python 3.11 via Control Panel
3. Clean PATH as shown above
4. Restart computer
5. Test in normal VS Code terminal
6. Deploy NeuroEscrow manually
