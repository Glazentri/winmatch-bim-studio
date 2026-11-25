param([ValidateSet("2025","2026")][string]$Version="2026")
$Manifest = Join-Path $env:APPDATA "Autodesk\Revit\Addins\$Version\WinMatch.Revit.addin"
if (Test-Path $Manifest) { Remove-Item -LiteralPath $Manifest }
Write-Host "WinMatch ribbon registration removed. Restart Revit. Application files are retained in LocalAppData."
