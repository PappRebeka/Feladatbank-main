# Feladatműveletek menete - Gyors magyarázat
 -- A feladat módosítása (legfőképpen a mentés ág) folyamat számos funkción keresztül zajlik, amely első ránézésre bonyolultnak tűnhet.
 -- Összezavarodottság esetére dokumentálom a nehezebben követhető funkciókank a menetét.          
 -- Vizuális segétségért forduljon a Feladatmodositas.svg fájlban található ábrához.        -PR

## Feladat módosítás (editing)
 -- **Kiindulópont**: Kattintson egy létező feladatra, majd a jobb felső sarokban található módosítás ikonra

1. feladtatCardClick()
    **definiálva:** load.js
    **implementálva:** `load.js/buildTaskCardPrimaryData()` által létrehozot *card* element click eseménye
    **funckiója:** a meghíváskor megkapott, a kártya *dataset* attributumjában tárolt adatot (feladat adatai) és felhasználót továbbadja a `setTaskModalContent()` funkciónak
 
2. setTaskModalContent()
    **definiálva:** load.js
    **implementálva:** `load.js/feladtatCardClick()` | `modify.js/updateTask()` | `modify.js/editThisFeladat()` által létrehozott *mégse* gombnak click eseménye
    **funckiója:** a feladat adatainak könnyen követhető módon való megtekintése modálban

3. CancelEditingThisFeladat()
    **definiálva:** modify.js
    **implementálva:** `load.js/setTaskModalContent()`
    **funckiója:** feladat modál fejlécében és láblécében levő gombok beállítása

4. editThisFeladat()
    **definiálva:** modify.js
    **implementálva:** `modify.js/CancelEditingThisFeladat()` által létrehozott *módosítás* gombnak click eseménye
    **funckiója:** lecseréli a `setTaskModalContent()` funkcióban megjelített adatokat *input* mezőkre; lecseréli a láblécben levő gombokat (*mentés* és *mégse*)

### *Mentés* ág
5. saveTask()
    **definiálva:** modify.js
    **implementálva:** `modify.js/editThisFeladat()` által létrehozott *mentés* gombnak click eseménye | `homepage.html/setEvents()` feladat létrehozása gomb click eseménye
    **funckiója:** új vagy létező feladat adatainak kiolvasása 
    
6. uploadTasks()
    **definiálva:** modify.js
    **implementálva:** `modify.js/saveTask()`
    **funckiója:** kiolvasott adatok backendre küldése mentésre

7. updateTask()
    **definiálva:** modify.js
    **implementálva:** `modify.js/uploadTasks()` módosítás ága
    **funckiója:** feladat adatai elmentése globális változóba, `buildTaskCardPrimaryData()` és`setTaskModalContent()` funckiók meghívása

8. a, buildTaskCardPrimaryData()
    **definiálva:** load.js
    **implementálva:** `modify.js/updateTask()` | `load.js/buildTaskCard()`
    **funckiója:** feladat kártya újraépítése a mentett adatokkal

8. b, setTaskModalContent()
    **definiálva:** load.js
    **implementálva:** `modify.js/updateTask()` | `load.js/setTaskModalContent()` | `modify.js/editThisFeladat()` által létrehozott *mégse* gombnak click eseménye
    **funckiója:** feladat modál input mezőit visszaállítja módosíthatatlan szöveggé
    
9. CancelEditingThisFeladat()
    **definiálva:** modify.js
    **implementálva:** `load.js/setTaskModalContent()`
    **funckiója:** feladat modál fejlécében és láblécében levő gombok visszaállítása

### *Mégse* ág
5. setTaskModalContent()
    **definiálva:** load.js
    **implementálva:** `modify.js/editThisFeladat()` által létrehozott *mégse* gombnak click eseménye | `modify.js/updateTask()` | `load.js/setTaskModalContent()`
    **funckiója:** feladat modál input mezőit visszaállítja módosíthatatlan szöveggé
    
6. CancelEditingThisFeladat()
    **definiálva:** modify.js
    **implementálva:** `load.js/setTaskModalContent()`
    **funckiója:** feladat modál fejlécében és láblécében levő gombok visszaállítása