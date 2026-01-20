/* ------ CONTENT ------
task_scripts/load.js ---------------
    - autocompleteArrayTolt    -RD
    - megosztFeladatTanarral   -RD
*/ 

function autocompleteArrayTolt(){ //RD
    const user_email = ajax_post("/autocompleteArrayTolt", 1, {})
    var tolteniValo = []; 
    var html = ""
    for (const alma of user_email.results) {
        var nev = alma.Nev
        var email = alma.Email
        tolteniValo.push(nev)
        tolteniValo.push(email)
        var opt1 = document.createElement("option")
        var opt2 = document.createElement("option")
        opt1.textContent = nev
        opt2.textContent = email
        document.getElementById("vevoInputText").appendChild(opt1)
        document.getElementById("vevoInputText").appendChild(opt2)
    }
    console.log(document.getElementById("vevoInputText"))
    CreateSlimSelect2('vevoInputText', megosztSelectTeszt)
  }

  function megosztFeladatTanarral(){ //RD
    const cimzett = document.getElementById("vevoInputText").value
    const feladatId = feladatAdatai.id

    const result = ajax_post("/FeladatMegosztasaTanarral", 1, { cimzett: cimzett, feladatId: feladatId })
    
    if (result.success) {
      toastMsg("Sikeres megosztás", `A feladat sikeresen meg lett osztva ${cimzett}`, "success")
    } else {
      toastMsg("Hiba történt", result.error || "Nem sikerült megosztani a feladatot", "danger")
    }
  }

  function visszavonClick(id, vevo){
    const result = ajax_post('megosztasVisszavon', 1, {id, vevo})
    
    if (result.success) {
      toastMsg("Megosztás visszavonva", "", 'success')
    } else {
      toastMsg("Hiba", result.error || "Nem sikerült visszavonni a megosztást", "danger")
    }
}