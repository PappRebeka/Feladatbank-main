/* ------ CONTENT ------
backup.js --------------
    - getBackupOptions      -RD
    - saveBackup            -RD
    - restoreBackup         -RD
*/

//mi a fasz
/*async function getBackupOptions(adatok = await ajax_post("/backupTolt", 1, {})){ //RD
    document.getElementById("backupSelect").replaceChildren()
    for (const file of adatok.fajlok) {
        let opt = document.createElement('option')
        opt.value = file
        opt.textContent = file

        document.getElementById("backupSelect").appendChild(opt)
    }
}*/
async function saveBackup(){ //RD
    var adatok = await ajax_post("/MentBackup", 1, {})
    if(adatok["error"]) {
        toastMsg("Hiba!",adatok["error"], "danger");
        return;
    }
    getBackupOptions(adatok);
}

async function restoreBackup(){ //RD
    var selectedbackup = document.getElementById("backupSelect").value
    var valasz = await ajax_post("/RestoreBackup", 1, { dumpNev: selectedbackup })
    toastMsg("Figyelmeztetés", valasz.str, "warning")
}
    