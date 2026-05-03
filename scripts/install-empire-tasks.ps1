# OmniOrg Empire - Task Scheduler Installer
# Registers:
#   1. "OmniOrg Empire Daily"    - runs every day at 06:00 BST
#   2. "OmniOrg Monthly Report"  - runs on 1st of each month at 07:00 BST
#
# Run as Administrator:
#   Right-click PowerShell -> Run as administrator
#   Then: cd C:\Users\BBMW0\Projects\OmniOrg && .\scripts\install-empire-tasks.ps1

$workDir = "C:\Users\BBMW0\Projects\OmniOrg"
$node    = "node"

# Resolve logged-in user (works even when elevated)
$loggedInUser = (Get-CimInstance -ClassName Win32_ComputerSystem).UserName
if (-not $loggedInUser) { $loggedInUser = "$env:USERDOMAIN\$env:USERNAME" }

Write-Host ""
Write-Host "OmniOrg Empire - Task Scheduler Setup" -ForegroundColor Cyan
Write-Host "User: $loggedInUser" -ForegroundColor Yellow
Write-Host "Work directory: $workDir" -ForegroundColor Yellow
Write-Host ""

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances    IgnoreNew `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit   (New-TimeSpan -Hours 5) `
    -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries

$principal = New-ScheduledTaskPrincipal `
    -UserId    $loggedInUser `
    -LogonType S4U `
    -RunLevel  Highest

# -- TASK 1: Daily Production Runner ------------------------------------------

$task1Name = "OmniOrg Empire Daily"

Unregister-ScheduledTask -TaskName $task1Name -Confirm:$false -ErrorAction SilentlyContinue

$task1Action = New-ScheduledTaskAction `
    -Execute         $node `
    -Argument        "--max-old-space-size=4096 -r ts-node/register scripts/run-daily-empire.ts" `
    -WorkingDirectory $workDir

$task1Trigger = New-ScheduledTaskTrigger -Daily -At "06:00"

$task1 = New-ScheduledTask `
    -Action    $task1Action `
    -Trigger   $task1Trigger `
    -Settings  $settings `
    -Principal $principal `
    -Description "OmniOrg daily content factory: NanoBanana + Multi-Engine Script Writer + Social Publisher across all 4 channels. 522 pieces/month."

Register-ScheduledTask -TaskName $task1Name -InputObject $task1 -Force | Out-Null
Write-Host "[OK] Task registered: '$task1Name' - daily at 06:00" -ForegroundColor Green

# -- TASK 2: Monthly Report (also triggered from daily runner on 1st) ---------

$task2Name = "OmniOrg Monthly Report"

Unregister-ScheduledTask -TaskName $task2Name -Confirm:$false -ErrorAction SilentlyContinue

$schedService = New-Object -ComObject "Schedule.Service"
$schedService.Connect()
$rootFolder = $schedService.GetFolder("\")

$taskDef = $schedService.NewTask(0)
$taskDef.RegistrationInfo.Description = "OmniOrg monthly performance report emailed to up866106@gmail.com and bbmw0@hotmail.com on the 1st of each month."
$taskDef.RegistrationInfo.Author      = "BBMW0 Technologies"
$taskDef.Settings.MultipleInstances   = 2
$taskDef.Settings.StartWhenAvailable  = $true
$taskDef.Settings.RunOnlyIfNetworkAvailable = $true
$taskDef.Settings.ExecutionTimeLimit  = "PT2H"

$trigger2 = $taskDef.Triggers.Create(4)
$trigger2.DaysOfMonth  = 1
$trigger2.MonthsOfYear = 4095
$trigger2.StartBoundary = "2026-06-01T07:00:00"
$trigger2.Enabled = $true

$action2 = $taskDef.Actions.Create(0)
$action2.Path             = $node
$action2.Arguments        = "--max-old-space-size=2048 -r ts-node/register intelligence/reporting/monthly-report-agent.ts"
$action2.WorkingDirectory = $workDir

$taskDef.Principal.UserId    = $loggedInUser
$taskDef.Principal.LogonType = 3
$taskDef.Principal.RunLevel  = 1

$rootFolder.RegisterTaskDefinition(
    $task2Name,
    $taskDef,
    6,
    $null,
    $null,
    3
) | Out-Null

Write-Host "[OK] Task registered: '$task2Name' - 1st of every month at 07:00" -ForegroundColor Green

# -- Summary ------------------------------------------------------------------

Write-Host ""
Write-Host "All tasks registered successfully." -ForegroundColor Cyan
Write-Host ""
Write-Host "Registered tasks:" -ForegroundColor White
Get-ScheduledTask | Where-Object { $_.TaskName -like "OmniOrg*" } | Format-Table TaskName, State, @{n="NextRun";e={(Get-ScheduledTaskInfo -TaskName $_.TaskName).NextRunTime}} -AutoSize
Write-Host ""
Write-Host "To test immediately (runs full daily production now):" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName 'OmniOrg Empire Daily'" -ForegroundColor Gray
Write-Host ""
Write-Host "To view logs: output\daemon\daemon-$(Get-Date -Format 'yyyy-MM-dd').jsonl" -ForegroundColor Gray
Write-Host "To view reports: output\reports\" -ForegroundColor Gray
Write-Host ""
