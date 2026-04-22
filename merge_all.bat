@echo off
echo Zacinam ziskavat a slucovat vsechny vetve do main...

:: Pridat a ulozit zmeny
git add .
git commit -m "Zaloha zmen pred slucovanim"

:: Prepne na main
git checkout main

:: Ziska vsechny lokalni vetve a slouci je do main
for /f "delims=" %%a in ('git branch --format="%%(refname:short)"') do (
    if /i not "%%a"=="main" (
        echo Slucuji vetev: %%a
        git merge %%a
        echo Mazu vetev: %%a
        git branch -D %%a
    )
)

echo.
echo Vsechny vetve byly sloucene do main a vymazany.
pause
