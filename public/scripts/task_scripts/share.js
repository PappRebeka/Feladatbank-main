/* ------ CONTENT ------
task_scripts/share.js ---------------
    - autocompleteShare_TeacherSelect   -RD  populate teacher/email autocomplete
    - shareTaskWithTeacher              -RD  send share request to server
    - removeSharedTask                  -PR  cancel a previously shared task
    - megosztSelectTeszt                -placeholder stub
*/ 

/** Build options for the recipient input by fetching a list of
 * teacher names/emails from the server. The associated datalist
 * element is emptied then populated with both full names and emails.
 */
async function autocompleteShare_TeacherSelect(){ //RD
    const user_email = await ajax_post("/autocompleteArrayTolt", 1, {}, false)
    var tolteniValo = []; 
    const input = document.getElementById("vevoInputText")
    input.replaceChildren()

    const emptyOpt = document.createElement("option")
    emptyOpt.setAttribute("data-placeholder", "true")
    input.appendChild(emptyOpt)
    for (const alma of user_email.results) {
        var nev = alma.Nev
        var email = alma.Email
        tolteniValo.push(nev)
        tolteniValo.push(email)
        var opt1 = document.createElement("option")
        var opt2 = document.createElement("option")
        opt1.textContent = nev
        opt2.textContent = email
        input.appendChild(opt1)
        input.appendChild(opt2)
    }
}
/** Placeholder function for share select widget.
 * It won't work without it.
 */
function megosztSelectTeszt(){}

/** Submit a request to share the current task with another teacher.
 * Reads the recipient from an input field and uses the global
 * feladatAdatai object for the task id. Displays a toast on success or failure.
 */
async function shareTaskWithTeacher(){ //RD
    const cimzett = document.getElementById("vevoInputText").value
    const feladatId = feladatAdatai.id
    
    const result = await ajax_post("/FeladatMegosztasaTanarral", 1, { cimzett: cimzett, feladatId: feladatId }, false)
    
    if (result.ok) {
      toastMsg("Sikeres megosztás", `A feladat sikeresen meg lett osztva ${cimzett}`, "success")
    } else {
      toastMsg("Hiba történt", "Nem sikerült megosztani a feladatot", "danger")
    }
}
/** Cancel a previously shared task, removing it from the recipient's view.
 * @param {number|string} id   - task id
 * @param {numbet|string} vevo - recipient identifier
 */
async function removeSharedTask(id, vevo){ //PR
  const result = await ajax_post('megosztasVisszavon', 1, {id, vevo}, false)
  
  if (result.ok) {
    toastMsg("Megosztás visszavonva", "", 'success')
  } else {
    toastMsg("Hiba", "Nem sikerült visszavonni a megosztást", "danger")
  }
}