# SPDX-License-Identifier: MIT
param(
  [ValidateSet("2025","2026")][string]$Version = "2026",
  [string]$RevitPath = "C:\Program Files\Autodesk\Revit $Version"
)
$ErrorActionPreference = 'Stop'
$Project = Join-Path $PSScriptRoot "WinMatch.Revit.csproj"
if (!(Test-Path (Join-Path $RevitPath "RevitAPI.dll"))) { throw "Specify the installed Revit location using -RevitPath." }
if (!(Get-Command dotnet -ErrorAction SilentlyContinue)) { throw "Install the .NET 8 SDK first." }
$Target = Join-Path $env:LOCALAPPDATA "Glazentri\WinMatchBIM\Revit\$Version"
New-Item -ItemType Directory -Path $Target -Force | Out-Null
dotnet build $Project -c Release -p:RevitVersion=$Version "-p:RevitPath=$RevitPath" -o $Target
if ($LASTEXITCODE -ne 0) { throw "Build failed. Manifest was not installed." }
$Dir = Join-Path $env:APPDATA "Autodesk\Revit\Addins\$Version"
New-Item -ItemType Directory -Path $Dir -Force | Out-Null
$Assembly = [System.Security.SecurityElement]::Escape((Join-Path $Target "WinMatch.Revit.dll"))
$Manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<RevitAddIns>
  <AddIn Type="Application">
    <Name>WinMatch BIM Studio</Name>
    <Assembly>$Assembly</Assembly>
    <AddInId>46D7F55E-7FAE-4B15-8F4F-4F7B822F8890</AddInId>
    <FullClassName>WinMatch.Revit.Application</FullClassName>
    <VendorId>GLZT</VendorId>
    <VendorDescription>Glazentri — WinMatch BIM Studio</VendorDescription>
  </AddIn>
</RevitAddIns>
"@
$Manifest | Set-Content -Path (Join-Path $Dir "WinMatch.Revit.addin") -Encoding UTF8
Write-Host "Installed WinMatch for Revit $Version. Restart Revit and open the WinMatch ribbon."
