/* ------ CONTENT ------
backup.js --------------
    - getBackupOptions      -RD, BBB   fetch and display available backup files
    - saveBackup            -RD, BBB   trigger server backup creation and refresh options
    - restoreBackup         -RD, BBB   restore from selected backup and display server response
*/

/** Fetch available backup files from the server and populate the select element 
 *  with options. If `kapottAdatok` is provided, it is used instead of making a server request.
 * @param {object} kapottAdatok -- optional data object containing backup file information
 */
async function getBackupOptions(kapottAdatok){ //RD, BBB
    var adatok = kapottAdatok ?? await ajax_post("/backupTolt", 1, {})
    document.getElementById("backupSelect").replaceChildren()
    for (const file of adatok.fajlok) {
        let opt = document.createElement('option')
        opt.value = file
        opt.textContent = file

        document.getElementById("backupSelect").appendChild(opt)
    }
}

/** Trigger the backup save process by requesting the server to create a backup file. */
async function saveBackup(){ //RD, BBB
    var adatok = await ajax_post("/MentBackup", 1, {}, true)
    if(adatok["error"]) {
        toastMsg("Hiba!",adatok["error"], "danger");
        return;
    }
    await getBackupOptions(adatok);
}

/** Request the server to restore from the selected backup file. 
 * Displays a warning toast with the server's response message.
 */
async function restoreBackup(){ //RD, BBB
    var selectedbackup = document.getElementById("backupSelect").value
    var valasz = await ajax_post("/RestoreBackup", 1, { dumpNev: selectedbackup }, true)
    toastMsg("Figyelmeztetés", valasz.str, "warning")
}
    