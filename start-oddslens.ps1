# OddsLens one-click start — right-click > Run with PowerShell (or double-click if .ps1 opens with pwsh).
# Starts website + auto bot loop (real ESPN data, refreshes every 5 min, no key needed).
Set-Location -LiteralPath $PSScriptRoot
& "C:\Program Files\nodejs\npm.cmd" run dev:all
