/* ------ CONTENT ------
institution.js ---------
    - addInstitution             -RD
    - editInstitution            -RD  
    - deleteInstitution          -RD
    - toggleInstitutionRadio     -PR
    - toggleInstitutionOption       -RD, PR
    - autofillInstitutionSelect       -RD
    - autofillOtherInstitutions  -RD
*/

function addInstitution(){ //RD
    var intezmValue = document.getElementById("intezmenyMezo").value
    ajax_post("/MentIntezmeny", 1, { intezmeny: intezmValue })
    toggleInstitutionOption(0)
    toastMsg("Sikeres művelet", `Sikeresen létrejött a(z) ${intezmValue} intézmény`, "success")
    moveUserClick()
}

function editInstitution(){ //RD
    var intezmValue = document.getElementById("ujIntezmeny").value
    ajax_post("/modositIntezmeny", 1, { id: intezmenyId, intezmeny: intezmValue })
    toggleInstitutionOption(1)
    toastMsg("Sikeres művelet", `Sikeresen módosította az intézmény`, "success")
    moveUserClick()
}

function deleteInstitution(){ //RD
    ajax_post("/torolIntezmeny", 1, { id: intezmenyId })
    toggleInstitutionOption(2)
    toastMsg("Sikeres művelet", `Sikeresen eltávolította az intézmény`, "success")
    moveUserClick()
}

function toggleInstitutionRadio(chosenOne){ //PR
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

function toggleInstitutionOption(index){ //RD, PR
    //let html = intezmenyOptionTemplate(index)
    var type = ["", "javit", "torol"][index] || ""

    var thatone = document.querySelectorAll('#IntezmenyOptions .bg-login')[index]

    thatone.classList.toggle('d-none')
    try{thatone.querySelector('input').value = ''}catch{}
    //document.getElementById("currentDatabaseOption").replaceChildren(html)
    autofillInstitutionSelect(type)
    
}

function autofillInstitutionSelect(mit, lista){//RD
    var inst = ajax_post("/SendIntezmeny", 1, {})
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

function autofillOtherInstitutions(lista){//RD
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
