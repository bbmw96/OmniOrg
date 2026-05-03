# OmniOrg Empire Daily — Task Scheduler installer
# Run this script as Administrator (right-click PowerShell > Run as administrator)

$taskName = "OmniOrg Empire Daily"
$workDir  = "C:\Users\BBMW0\Projects\OmniOrg"

# Resolve the actual logged-in user even when script runs elevated
$loggedInUser = (Get-CimInstance -ClassName Win32_ComputerSystem).UserName
if (-not $loggedInUser) { $loggedInUser = "BBMW0\BBMW0" }

Write-Host "Registering task for user: $loggedInUser" -ForegroundColor Cyan

# Remove existing task if present
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
    -Execute "node" `
    -Argument "--max-old-space-size=4096 -r ts-node/register scripts/run-daily-empire.ts" `
    -WorkingDirectory $workDir

# 07:00 daily; StartWhenAvailable catches missed runs if machine was off
$trigger = New-ScheduledTaskTrigger -Daily -At "07:00"

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 4) `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries

# S4U: runs as the named user without storing a password, no UAC prompt
$principal = New-ScheduledTaskPrincipal `
    -UserId    $loggedInUser `
    -LogonType S4U `
    -RunLevel  Highest

$task = New-ScheduledTask `
    -Action      $action `
    -Trigger     $trigger `
    -Settings    $settings `
    -Principal   $principal `
    -Description "OmniOrg daily content empire run via NEUROMESH agents."

Register-ScheduledTask -TaskName $taskName -InputObject $task -Force

Write-Host ""
Write-Host "Task registered: '$taskName'" -ForegroundColor Green
Write-Host "Runs daily at 07:00. To run it now:" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Yellow
Write-Host ""
Write-Host "To verify:" -ForegroundColor Cyan
Write-Host "  Get-ScheduledTask -TaskName '$taskName' | Format-List TaskName, State" -ForegroundColor Yellow
