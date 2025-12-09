@echo off
python update_from_figma_now.py
if %errorlevel% equ 0 (
    echo.
    echo Updating Git...
    git add .
    git commit -m "Update from Figma"
    git push origin main
    echo.
    echo Done! Site updated.
) else (
    echo.
    echo Error occurred. Check the output above.
)
pause

