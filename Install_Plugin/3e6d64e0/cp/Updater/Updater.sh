#!/bin/bash

# Save the current directory path
currentDir="$(pwd)"

# Replace spaces with _SPC_ in the current directory path
currentDirMod="${currentDir// /_SPC_}"

# Reuse the modified current directory path if passed as argument
if [ "$1" != "" ]; then
    currentDir="$1"
    currentDir="${currentDir//_SPC_/ }"
fi

# Print the current directory
echo "Photoshop Directory: \"$currentDir\""
echo

# Clean old plugin if exists
if [ -d "$currentDir/Plug-ins/3e6d64e0" ]; then
    # echo " - Cleaning old plugin: 3e6d64e0..."
    rm -rf "$currentDir/Plug-ins/3e6d64e0"
fi

if [ -d "$currentDir/Plug-ins/tmp" ]; then
    echo " - Cleaning temp directory..."
    rm -rf "$currentDir/Plug-ins/tmp"
fi

if [ -f "$currentDir/temp.zip" ]; then
    echo " - Cleaning temp ZIP..."
    rm "$currentDir/temp.zip"
fi

echo " - Downloading..."
echo " - from github.com/NimaNzrii/comfyui-photoshop..."

curl -L -o "$currentDir/temp.zip" https://github.com/NimaNzrii/comfyui-photoshop/archive/refs/heads/main.zip

mkdir -p "$currentDir/Plug-ins/tmp"

echo
unzip -o "$currentDir/temp.zip" -d "$currentDir/Plug-ins/tmp"

if [ -d "$currentDir/Plug-ins/tmp/comfyui-photoshop-main/Install_Plugin/3e6d64e0" ]; then
    # echo " - Installing..."
    mv "$currentDir/Plug-ins/tmp/comfyui-photoshop-main/Install_Plugin/3e6d64e0" "$currentDir/Plug-ins/"
    echo
    echo " - Latest Version installed Successfully"
    echo " - Please restart Photoshop."
    echo
fi

# Clean up
if [ -d "$currentDir/Plug-ins/tmp" ]; then
    # echo " - Cleaning temp..."
    rm -rf "$currentDir/Plug-ins/tmp"
fi

if [ -f "$currentDir/temp.zip" ]; then
    rm "$currentDir/temp.zip"
fi
