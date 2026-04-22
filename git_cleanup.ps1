# Přidá všechny případné neuložené změny
git add .
git commit -m "Záloha aktuálních změn před úklidem"

# Přepne na hlavní větev main
git checkout main

# Pokusí se sloučit všechny ostatní lokální větve do main a pak je smazat
$branches = git branch --format="%(refname:short)" | Where-Object { $_ -ne "main" }

foreach ($branch in $branches) {
    Write-Host "Slučuji a mažu větev: $branch"
    git merge $branch
    git branch -D $branch
}

# Odstraní neplatné či smazané worktrees (pokud nějaké jsou)
git worktree prune

Write-Host "Vše bylo sloučeno do main a ostatní větve byly smazány!"
