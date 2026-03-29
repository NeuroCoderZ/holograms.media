$inputRaw = $Input | Out-String
if (-not [string]::IsNullOrWhiteSpace($inputRaw)) { $hookInput = $inputRaw | ConvertFrom-Json }
$Title = "TRIA GLOBAL"
$Message = "Задача v0.20.250 завершена! База знаний синхронизирована."
try {
    Add-Type -AssemblyName System.Windows.Forms
    $notify = New-Object System.Windows.Forms.NotifyIcon
    $notify.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon((Get-Process -id $PID).Path)
    $notify.BalloonTipTitle = $Title
    $notify.BalloonTipText = $Message
    $notify.Visible = $true
    $notify.ShowBalloonTip(5000)
    Start-Sleep -Seconds 1
    $notify.Dispose()
} catch {}
Write-Output '{"decision": "allow"}'
