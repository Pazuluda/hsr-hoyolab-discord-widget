$TaskName = "HSR HoYoLAB Agent"
$BatPath = Join-Path $PSScriptRoot "start-agent.bat"

schtasks /Delete /TN $TaskName /F 2>$null
schtasks /Create /TN $TaskName /TR "`"$BatPath`"" /SC ONLOGON /RL HIGHEST /F
schtasks /Query /TN $TaskName
