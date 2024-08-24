@echo off
setlocal enabledelayedexpansion

:: Save the current directory path
set "currentDir=%cd%"

:: Replace spaces with _SPC_ in the current directory path
set "currentDirMod=!currentDir: =_SPC_!"

:: Check for admin access
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing New Ver...
    powershell -Command "Start-Process '%~f0' -ArgumentList '%currentDirMod%' -Verb RunAs"
    exit /b
)

:: Reuse the modified current directory path if needed
set "currentDir=%~1"
:: Replace _SPC_ back to spaces in the current directory path
set "currentDir=!currentDir:_SPC_= !"

:: Print the current directory after elevation
echo Photoshop Directory: "!currentDir!"
echo.

if exist "!currentDir!\Plug-ins\3e6d64e0" (
    :: echo - Cleaning old plugin: 3e6d64e0...
    rd /s /q "!currentDir!\Plug-ins\3e6d64e0"
) 

if exist "!currentDir!\Plug-ins\tmp" (
    echo - Cleaning temp directory...
    rd /s /q "!currentDir!\Plug-ins\tmp"
)

if exist "!currentDir!\temp.zip" (
    echo - Cleaning temp ZIP...
    del "!currentDir!\temp.zip"
)

echo - Downloading...
echo - from github.com/NimaNzrii/comfyui-photoshop...

curl -L -o "!currentDir!\temp.zip" https://github.com/NimaNzrii/comfyui-photoshop/archive/refs/heads/main.zip

if not exist "!currentDir!\Plug-ins\tmp" mkdir "!currentDir!\Plug-ins\tmp"

echo.
powershell -Command "Push-Location -Path '!currentDir!'; Expand-Archive -Path 'temp.zip' -DestinationPath 'Plug-ins\tmp' -Force; Pop-Location"

if exist "!currentDir!\Plug-ins\tmp\comfyui-photoshop-main\Install_Plugin\3e6d64e0" (
    ::echo - Installing...
    move "!currentDir!\Plug-ins\tmp\comfyui-photoshop-main\Install_Plugin\3e6d64e0" "!currentDir!\Plug-ins\" >nul 2>&1
    echo.
    echo - Latest Version installed Sucessfully
    echo - Please restart Photoshop.
    echo.
)

if exist "!currentDir!\Plug-ins\tmp" (
    :: echo - Cleaning temp...
    rd /s /q "!currentDir!\Plug-ins\tmp"
)

if exist "!currentDir!\temp.zip" (
    del "!currentDir!\temp.zip"
)

pause
