/* ------ CONTENT ------
backup.js --------------
    - getBackupOptions      -RD
    - saveBackup            -RD
    - restoreBackup         -RD
*/
function getBackupOptions(adatok = ajax_post("/backupTolt", 1, {})){ //RD
    document.getElementById("backupSelect").replaceChildren()
    for (const file of adatok.fajlok) {
        let opt = document.createElement('option')
        opt.value = file
        opt.textContent = file

        document.getElementById("backupSelect").appendChild(opt)
    }
}
function saveBackup(){ //RD
    var adatok = ajax_post("/MentBackup", 1, {})
    if(adatok["error"]) {
        toastMsg("Hiba!",adatok["error"], "danger");
        return;
    }
    getBackupOptions(adatok);
}

function restoreBackup(){ //RD
    var selectedbackup = document.getElementById("backupSelect").value
    var valasz = ajax_post("/RestoreBackup", 1, { dumpNev: selectedbackup })
    toastMsg("Figyelmeztetés", valasz.str, "warning")
}
    