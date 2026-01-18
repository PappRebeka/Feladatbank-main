//marker
function hozzaadIntezmeny(){ //RD
    var intezmValue = document.getElementById("intezmenyMezo").value
    ajax_post("/MentIntezmeny", 1, { intezmeny: intezmValue })
}

function modositIntezmeny(){ //RD
    var intezmValue = document.getElementById("JavitMezo").value
    ajax_post("/modositIntezmeny", 1, { id: intezmenyId, intezmeny: intezmValue })
}

function torolIntezmeny(){ //RD
    ajax_post("/torolIntezmeny", 1, { id: intezmenyId })
}

function IntezmenyRadioToggle(chosenOne){ //PR
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

function setIntezmenyOption(index){ //?
    let html = intezmenyOptionTemplate(index)
    var type = ["", "javit", "torol"][index] || ""

    document.getElementById("currentDatabaseOption").replaceChildren(html)
    IntezmenyArrayTolt(type)
    CreateSlimSelect2('torolIntezmeny', IntezmenyChanged)
}

//marker
function IntezmenyArrayTolt(mit, lista){//RD
    var corp = ajax_post("/SendIntezmeny", 1, {})
    var html = []
    for (const lob of corp.results) {
        intezmenyek.push(lob.IntezmenyNev)

        let opt = document.createElement('option')
        opt.value = lob.id
        opt.textContent = lob.IntezmenyNev

        html.push(opt)
    }  
    if(mit == "javit"){
        document.getElementById("javitIntezmeny").replaceChildren(...html)// passes each element as separate arguments
        CreateSlimSelect2('javitIntezmeny', IntezmenyChanged)
    }        
    if(mit == "torol"){
        document.getElementById("torolIntezmeny").replaceChildren(...html);// html[0], html[1], html[2], ...
        CreateSlimSelect2('torolIntezmeny', IntezmenyChanged)
    }
}

function IntezmenyAthelyezTolt(lista){
    document.getElementById("ujIntezmeny").innerHTML = "";
    var html = []
    for (const asdf of lista) {
        let opt = document.createElement('option')
        opt.value = asdf.id
        opt.textContent = asdf.intezmenyNev

        html.push(opt)
    }  
    document.getElementById("ujIntezmeny").replaceChildren(...html);
}

function AthelyezTeszt(e){
    console.log(e)
}