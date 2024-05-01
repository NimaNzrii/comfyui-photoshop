@echo off
cd /d "%~dp0"
call venv\Scripts\activate
python -m pip install -r requirements.txt
echo Requirements installed successfully.
pause
