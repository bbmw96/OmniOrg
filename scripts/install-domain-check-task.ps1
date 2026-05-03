# Registers a Task Scheduler job that polls Resend every 30 min
# until agents.bbmw0.com is verified, then self-removes.
# Run as Administrator.

$taskName    = "OmniOrg Domain Check"
$workDir     = "C:\Users\BBMW0\Projects\OmniOrg"
$loggedInUser = (Get-CimInstance -ClassName Win32_ComputerSystem).UserName
if (-not $loggedInUser) { $loggedInUser = "BBMW0\BBMW0" }

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
    -Execute "node" `
    -Argument "--max-old-space-size=4096 -r ts-node/register scripts/check-resend-domain.ts" `
    -WorkingDirectory $workDir

# Repeat every 30 minutes, for up to 7 days (script self-removes when verified)
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 30) -Once -At (Get-Date)

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

$principal = New-ScheduledTaskPrincipal `
    -UserId    $loggedInUser `
    -LogonType S4U `
    -RunLevel  Highest

$task = New-ScheduledTask `
    -Action    $action `
    -Trigger   $trigger `
    -Settings  $settings `
    -Principal $principal `
    -Description "Polls Resend API every 30 min; emails bbmw0@hotmail.com when agents.bbmw0.com is verified."

Register-ScheduledTask -TaskName $taskName -InputObject $task -Force

Write-Host ""
Write-Host "Task registered: '$taskName'" -ForegroundColor Green
Write-Host "Polls every 30 min. Sentinel Prime emails you the moment the domain goes green." -ForegroundColor Cyan
Write-Host "The task removes itself automatically once verified." -ForegroundColor Cyan
