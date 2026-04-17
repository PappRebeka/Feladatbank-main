/* ------ CONTENT ------
institution.js ---------
    - addInstitution               -RD      submit a request to add a new institution and refresh UI.
    - editInstitution              -RD      submit change request for selected institution.
    - deleteInstitution            -RD      request deletion of the chosen institution.
    - toggleInstitutionRadio       -PR      visual helper: mark a radio option as selected
    - toggleInstitutionOption      -RD, PR  show/hide institution management panel section by index
    - autofillInstitutionSelect    -RD      fill dropdowns with the current list of institutions
    - autofillOtherInstitutions    -RD      fill the "other institutions" select element with provided list
*/

/** Submit a request to add a new institution and refresh UI.  */
async function addInstitution(){
    var intezmValue = document.getElementById("intezmenyMezo").value
    await ajax_post("/MentIntezmeny", 1, { intezmeny: intezmValue }, false)
    await toggleInstitutionOption(0)
    toastMsg("Sikeres művelet", `Sikeresen létrejött a(z) ${intezmValue} intézmény`, "success")
    await moveUserClick()
    for (const element of ['', 'javit', 'torol']) {
        await autofillInstitutionSelect(element)
    }
}

/** Submit change request for selected institution. */
async function editInstitution(){
    var intezmValue = document.getElementById("ujIntezmeny").value
    await ajax_post("/modositIntezmeny", 1, { id: intezmenyId, intezmeny: intezmValue }, false)
    await toggleInstitutionOption(1)
    toastMsg("Sikeres művelet", `Sikeresen módosította az intézmény`, "success")
    await moveUserClick()
    for (const element of ['', 'javit', 'torol']) {
        await autofillInstitutionSelect(element)
    }
}

/** Request deletion of the chosen institution. */
async function deleteInstitution(){
    await ajax_post("/torolIntezmeny", 1, { id: intezmenyId }, false)
    await toggleInstitutionOption(2)
    toastMsg("Sikeres művelet", `Sikeresen eltávolította az intézmény`, "success")
    await moveUserClick()
    for (const element of ['', 'javit', 'torol']) {
        await autofillInstitutionSelect(element)
    }
}

/** Visual helper: mark a radio option as selected.
 * @param {HTMLElement} chosenOne
 */
function toggleInstitutionRadio(chosenOne){
    let id = chosenOne.id+"_Option"

    for (const element of document.querySelector("#IntezmenyOptions").querySelectorAll('label.btn')) {
        let i = element.id.replace("Stat","")

        document.getElementById(i).checked = false
        element.classList.add("btn-light")
        element.classList.remove("btn-outline-light")    
    }

    document.getElementById(id).classList.add("btn-outline-light")
    document.getElementById(id).classList.remove(`btn-light`)
    chosenOne.checked = true
}

/** Show/hide institution management panel section by index.
 * @param {number} index
 */
async function toggleInstitutionOption(index){
    //let html = intezmenyOptionTemplate(index)
    var type = ["", "javit", "torol"][index] || ""

    var thatone = document.querySelectorAll('#IntezmenyOptions .bg-login')[index]

    thatone.classList.toggle('d-none')
    try{thatone.querySelector('input').value = ''}catch{}
    //document.getElementById("currentDatabaseOption").replaceChildren(html)
    await autofillInstitutionSelect(type)
    
}

/** Fill dropdowns with the current list of institutions.
 * @param {string} mit - type of select ("javit", "torol", or "") 
 */
async function autofillInstitutionSelect(mit){
    var inst = await ajax_post("/SendIntezmeny", 1, {}, false)
    var html = []
    for (const item of inst.results) {
        intezmenyek.push(item.IntezmenyNev)

        let opt = document.createElement('option')
        opt.value = item.id
        opt.textContent = item.IntezmenyNev

        html.push(opt)
    }
    if(mit == "javit"){
        document.getElementById("javitIntezmeny").replaceChildren(...html)// passes each element as separate arguments
        createSlimSelect('javitIntezmeny', IntezmenyChanged)
    }        
    if(mit == "torol"){ 
        document.getElementById("torolIntezmeny").replaceChildren(...html);// html[0], html[1], html[2], ...
        createSlimSelect('torolIntezmeny', IntezmenyChanged)
    }
}

/** Fill the "other institutions" select element with provided list.
 * @param {Array} lista
 */
function autofillOtherInstitutions(lista){
    document.getElementById("ujIntezmenySelect").innerHTML = "";
    var html = []
    for (const asdf of lista) {
        let opt = document.createElement('option')
        opt.value = asdf.id
        opt.textContent = asdf.intezmenyNev

        html.push(opt)
    }  
    document.getElementById("ujIntezmenySelect").replaceChildren(...html)
}
