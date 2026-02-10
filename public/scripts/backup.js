/* ------ CONTENT ------
backup.js --------------
    - getBackupOptions      -RD
    - saveBackup            -RD
    - restoreBackup         -RD
*/

//ki volt az a cigány aki kikommentelte?
async function getBackupOptions(kapottAdatok){ //RD
    var adatok = kapottAdatok ?? await ajax_post("/backupTolt", 1, {})
    document.getElementById("backupSelect").replaceChildren()
    for (const file of adatok.fajlok) {
        let opt = document.createElement('option')
        opt.value = file
        opt.textContent = file

        document.getElementById("backupSelect").appendChild(opt)
    }
}
async function saveBackup(){ //RD
    var adatok = await ajax_post("/MentBackup", 1, {}, true)
    if(adatok["error"]) {
        toastMsg("Hiba!",adatok["error"], "danger");
        return;
    }
    await getBackupOptions(adatok);
}

async function restoreBackup(){ //RD
    var selectedbackup = document.getElementById("backupSelect").value
    var valasz = await ajax_post("/RestoreBackup", 1, { dumpNev: selectedbackup }, true)
    toastMsg("Figyelmeztetés", valasz.str, "warning")
}
    