/* ------ CONTENT ------
task_scripts/share.js ---------------
    - autocompleteShare_TeacherSelect   -RD
    - shareTaskWithTeacher              -RD
    - removeSharedTask                  -PR
*/ 

function autocompleteShare_TeacherSelect(){ //RD
    const user_email = ajax_post("/autocompleteArrayTolt", 1, {})
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
function megosztSelectTeszt(){}

function shareTaskWithTeacher(){ //RD
    const cimzett = document.getElementById("vevoInputText").value
    const feladatId = feladatAdatai.id
    
    const result = ajax_post("/FeladatMegosztasaTanarral", 1, { cimzett: cimzett, feladatId: feladatId })
    
    if (result.success) {
      toastMsg("Sikeres megosztás", `A feladat sikeresen meg lett osztva ${cimzett}`, "success")
    } else {
      toastMsg("Hiba történt", result.error || "Nem sikerült megosztani a feladatot", "danger")
    }
}

function removeSharedTask(id, vevo){ //PR
  const result = ajax_post('megosztasVisszavon', 1, {id, vevo})
  
  if (result.success) {
    toastMsg("Megosztás visszavonva", "", 'success')
  } else {
    toastMsg("Hiba", result.error || "Nem sikerült visszavonni a megosztást", "danger")
  }
}