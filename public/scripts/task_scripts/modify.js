/* ------ CONTENT ------
task_scripts/load.js ---------------
    - fajlUpload               -BBB
    - mentFeladat              -BBB, PR 
    - resetFeladathozzaad      -PR
    - AlfeladatHozzaad         -PR+
    - AlfeladatEltavolit       -PR
    - updateFeladat            -PR
    - feladatArch              -PR
    - editThisFeladat          -PR
    - AlfFileChanged           -PR
    - CancelEditingThisFeladat -PR
    - TorolFeladat             -PR?
*/ 

async function fajlUpload(fajlInput) {//BBB
        
    const form = new FormData();
    form.append('fajl', 
        fajlInput.files[0]
    )

    return new Promise((resolve, reject) => {
        $.ajax({
        url: '/ment-fajl',
        method: 'POST',
        data: form,
        processData: false,
        contentType: false,
        success: function(res) {
            resolve(res.id ? res.id : null);
        },
        error: function(xhr) {
            reject(xhr.responseText);
        }
        });
    });
}

async function mentFeladat(hol) { //BBB, PR 
    let alfeladatok = [];
    let s = slim_felAdd ? "-s" : "" //whether slim mode is on or off
    let ujFeladat = (hol.includes("alfeladatBox")) ? true : false;

    const items = ujFeladat ? $("#alfeladatBox"+s).find(".alf_id").toArray()    //get the items depending on where the function was called from
                            : document.getElementById("alfeladatokContainer").querySelectorAll(".alfeladat");

    for (const item of items) {
        const $item = $(item);
        const fajlInput = $item.find(`.alfeladatFile`)[0]; 
        const fileIdentifier = fajlInput ? fajlInput.className.split("fajl-")[1] : "null";

        let file = (fajlInput && fajlInput.files.length != 0) 
    //if !null              --> new file       --> upload
    //if null && falj-null  --> no file        --> null
    //if null && !fajl-null --> old file       --> fetch id
        var fajlId = (file ? await fajlUpload(fajlInput) :
                        !file && fileIdentifier == "null") ? null :
                            fileIdentifier;

            
                    
        alfeladatok.push({
            "leiras": $item.find(`.alfeladatLeiras`)[0].value, 
            "alfId": $item.find(".alfId")[0] ? $item.find(".alfId")[0].id.substring(15) : null,
            "pontszam": $item.find(`.alfeladatPont`)[0].value, 
            "fajlId": fajlId,
            "isDelete": false
        })
    }

    try{
        for (const item of deleteIds) { // files to be deleted are stored in global
            alfeladatok.push({"isDelete": true, "alfId": item}) //extract them
        }
        deleteIds = []; // and clear from global
    }
    catch(err){/* error can occure if nothing is flagged, so just ignore that */}
    

    alfeladatok = alfeladatok.filter(a => !(a["leiras"] == "" && a["fajlId"] == null && a["pontszam"] == "")); // clear the empty ones

    var feladat = {
        "Nev":      getField("feladatNev"+s, hol),
        "Leiras":   getField("leiras"+s, hol),
        "Evfolyam": getField("evfolyam"+s, hol),
        "Tantargy": getField("tantargy"+s, hol),
        "Tema":     getField("tema"+s, hol),
        "Nehezseg": Math.min(getField("nehezseg"+s, hol), 10),
        "kurzusNeve": null,
        "tanarId": CurrentUserData.id,
        "alfeladatok": alfeladatok,
        "alfDb": alfeladatok.length,
        "isInsert": (ujFeladat ? 1 : 0),
        "id": feladatAdatai.id ?? null, // ?? -> if null or undfined
    }

    if (Object.values(feladat).some(a => a === "")) {
        toastMsg("Feladat nem menthető!", "A összes mezőt ki kell tölteni.", "warning"); 
        return;
    }

    err = false

    $.ajax({
        url: '/ment-feladat', 
        method: "POST",
        contentType: 'application/json',
        data: JSON.stringify(feladat),
        success: function (res) {
            if (ujFeladat) {loadPageData()
                            toastMsg("Feladat hozzáadva!", "A feladat hozzáadódott az adatbázishoz.", "success")}
            else {  updateFeladat(feladat, alfeladatok.filter(a => !(a["isDelete"]))); 
                    toastMsg("Feladat frissítve!", "A feladat frissítése sikeres volt.", "info")}
        },
        error: function (xhr) {
            console.error('hiba feladat feltöltésekor:', xhr.responseText);
            showErrorMsg('hiba feladat feltöltésekor')
            toastMsg("Valami borzasztó dolog történt!", "Nem sikerült végrahajtani a műveletet.", "danger")
            err = true
        }
    }); 

    resetFeladathozzaad();
}

function resetFeladathozzaad(){ //PR
    var s = slim_felAdd ? "-s" : "";
    // set the input values back to empty
    document.getElementById("feladatNev"+s)  .value = "";
    document.getElementById("leiras"+s)      .value = "";
    document.getElementById("evfolyam"+s)    .value = "";
    document.getElementById("tantargy"+s)    .value = "";
    document.getElementById("tema"+s)        .value = "";
    document.getElementById("nehezseg"+s)    .value = 5;
    document.getElementById("Difficulty"+s)  .innerText = "Nehézség - 5";
    document.getElementById("alfeladatBox"+s).innerHTML = "";
}

function AlfeladatHozzaad(hova){ //PR
    //creates a new subtask box
    const container = subtaskCardTemplate()
    container.id = `div${pId}`

    const button = $bind(container, 'removeButton')
    button.addEventListener('click', () => AlfeladatEltavolit(`div${pId}`));

    const input = container.querySelector('.alfeladatPont')
    input.addEventListener('input',() => EvfolyamCheck(input))

    const fakeFile = buildFakeFileInput(pId) 

    container.firstChild.appendChild(fakeFile)
    document.getElementById(hova).appendChild(container);
    pId++;
}

function buildFakeFileInput(id, fileName, fileIdentifier){
    const fakeFile = fakeFileTemplate()

    const label = fakeFile.children[0]
    const text = fakeFile.children[1]
    const input = fakeFile.children[2]

    
    label.id = `fakeFileButton${id}`
    text.id = `fakeFileText${id}`
    input.id = `alfFile${id}`

    if(fileIdentifier) input.classList.add(fileIdentifier)
    if(fileName) text.textContent = fileName

    label.setAttribute("for", `alfFile${id}`);
    input.addEventListener('change', () => {
        AlfFileChanged(input, `fakeFileText${id}`); 
        FileSizeCheck(input, `fakeFileText${id}`)
    })
    return fakeFile
}


function AlfeladatEltavolit(id){//PR
    document.getElementById(`${id}`).parentElement.remove(); // and thats how batman came to be
}

function updateFeladat(feladat, alfeladatok){//PR
    // update the task with the new data
    const container = buildTaskCardPrimaryData(feladat, null, null, null)
    document.getElementById("thisDivHasAnIdOf"+feladat.id).appendChild(container.firstChild)         
    
    CancelEditingThisFeladat(true, ''); // and stop the editing process
}

function feladatArch(state){  //PR
    talalatSzam.innerHTML = parseInt(talalatSzam.innerHTML)-1 
    ajax_post("/feladatArchivalas", 1, { id: feladatAdatai.id, state: state })
    document.getElementById(`thisDivHasAnIdOf${feladatAdatai.id}`).remove(); 
}

function addTextInputTo(place, object){
    for (const key in object) {
        if (!Object.hasOwn(object, key)) continue;
        
        const i = Number(key);
        const input = document.createElement('input')
        input.type = 'text'
        input.classList.add('form-control')
        input.id = object[key].id
        input.value = object[key].value
        
        if (!place[i]) continue;
        place[i].replaceChildren(input);

    }
}

function returnEditNehezsegSlider(){
    const safeNehezseg = Number(feladatAdatai.Nehezseg) || 5

    const nehInput = document.createElement('input'); nehInput.type = 'range'
    nehInput.id = 'nehezsegEdit'; nehInput.classList.add('form-range', 'nehezseg')
    nehInput.min = '1'; nehInput.max = '10'; nehInput.value = safeNehezseg
    nehInput.addEventListener('input', () => {
        document.getElementById('editableDiff').textContent = 'Nehézség - ' + nehInput.value
    })
    const nehLabel = document.createElement('label')
    nehLabel.id = 'editableDiff'; nehLabel.classList.add('form-label')
    nehLabel.textContent += 'Nehézség - '+safeNehezseg

    return {nehLabel, nehInput}
}

function editThisFeladat(){ // PR
    // replace the text with input fields
    deleteIds = [];
    let o = {'0': {id: 'feladatNevEdit', value: feladatAdatai.Nev ?? ""}}
    addTextInputTo(editFeladat.querySelectorAll(".modal-header"), o)

    document.querySelector("#alfeladatokContainer .nincsen")?.remove();

    const spans = modalFeladatContent.querySelectorAll("span")
    o = {
        '0': {id: 'tantargyEdit', value: feladatAdatai.Tantargy ?? ""},
        '1': {id: 'temaEdit',     value: feladatAdatai.Tema ?? ""},
        '2': {id: 'evfolyamEdit', value: feladatAdatai.Evfolyam ?? ""},
        '5': {id: 'leirasEdit',   value: feladatAdatai.Leiras ?? ""}
    }
    addTextInputTo(spans, o)
    spans[2].firstChild.setAttribute('inputmode', 'numeric')
    spans[2].firstChild.addEventListener('input', () => EvfolyamCheck(spans[2].firstChild))


    const {nehLabel, nehInput} = returnEditNehezsegSlider()
    NehezsegSliderPlace.replaceChildren(nehLabel)
    NehezsegSliderPlace.appendChild(nehInput)


    document.getElementById("HozzaadGoesHere").innerHTML = 
                                    `<div class="w-100"><hr class="w-75 mx-auto">
                                        <button class="btn d-flex text-dark align-items-center btn-light">
                                            <i class="bi bi-plus-circle fs-5 me-2"></i>
                                            <span>Alfeladat Hozzáadása</span>
                                        </button>
                                    </div>`
    document.querySelector("#HozzaadGoesHere button").addEventListener('click', () => AlfeladatHozzaad('alfeladatokContainer'))

    var db
    for (db = 0; db < editFeladat.querySelectorAll(".alfeladat").length; db++) {
        let thisOne = editFeladat.querySelectorAll(".alfeladat")[db]
        let alfeladatPlaceholderek = Array.from(thisOne.querySelectorAll("div span"))

        let fileName = alfeladatPlaceholderek[2].querySelector(".uploadedFileName")?.textContent || "Nincs fájl kiválsztva"
        let fileIdentifier = "fajl-" + (thisOne.querySelector(".card") ? //if theres a file we save its id in the identifier
                                thisOne.querySelector(".card").className.split("fajl-")[1] : "null")
         
        var alfId = thisOne.querySelector("div").id.substring(15);
        thisOne.querySelector(".deleteButtonGoesHere").appendChild(buildDeleteButton(alfId))
        
        
        thisOne.querySelectorAll("p")[0].innerHTML = `<span><strong>Pont:</strong><input type="text" class="form-control alfeladatPont"></span>`;
        thisOne.querySelectorAll("p")[0].querySelector('input').value = alfeladatPlaceholderek[0].innerText

        thisOne.querySelectorAll("span")[1].innerHTML = `<input type="text" class="form-control alfeladatLeiras">`;
        thisOne.querySelectorAll("span")[1].firstChild.value = alfeladatPlaceholderek[1].innerText

        thisOne.querySelectorAll("span")[2].appendChild(buildFakeFileInput(db, fileName, fileIdentifier)) // replace the file input with a fake, because you cant set its value  
    }
    const footer = editFeladat.querySelector(".modal-footer")
    footer.innerHTML = `<button type="button" class="btn btn-primary">Mentés</button>
                        <button type="button" class="btn btn-warning">Mégse</button>`

    const felhasznalo = "";                
    footer.children[0].addEventListener('click', () => { mentFeladat('editFeladat', db), resetFeladathozzaad()})
    footer.children[1].addEventListener('click', () => CancelEditingThisFeladat(true, felhasznalo))
}

function buildDeleteButton(id){
    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('btn', 'text-danger')

    const i = document.createElement('i')
    i.classList.add('bi', 'bi-x-circle', 'fs-4')
    button.appendChild(i)

    button.addEventListener('click', () => {
            deleteIds.push(id); AlfeladatEltavolit(`ThisIsAlfeladat${id}`)})
    
    return button
}

function AlfFileChanged(fileInput, id) {//PR
    let text = document.getElementById(id) //fake file name
    let def = text.innerText // the text pre uploas
    
    if (fileInput.files.length > 0) { // successful upload
        text.innerText = fileInput.files[0].name; //update name
    } else {            // faliure
        text.innerText = def; // keep default
    }
}

function CancelEditingThisFeladat(call_setModal, felhasznalo){ //PR 
    // set teh input fields back to texts and change the buttons
    const footer = editFeladat.querySelectorAll(".modal-footer")[0]
    const header = editFeladat.querySelectorAll(".modal-header")[0]
    header.innerHTML = `<h5 class="modal-title fw-semibold" id="feladatCime">${feladatAdatai.Nev}</h5>`
    footer.innerHTML = ""
    if(document.getElementById("hozzaadGoesHere")) document.getElementById("HozzaadGoesHere").innerHTML = "" 

    if(ActiveLocation == "Feladataim") {
        header.innerHTML += `<button class="btn"><i class="bi bi-pencil-square fs-5"></i></button>`
        footer.innerHTML = `<button type="button" class="btn btn-warning" data-bs-dismiss="modal">Archiválás</button>
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#megosztFeladat">Megosztás</button>`
    

        header.children[1].addEventListener("click", () => editThisFeladat());
        footer.children[0].addEventListener("click", () => feladatArch(1));
        footer.children[1].addEventListener("click", () => autocompleteArrayTolt());
    }
    
    if (ActiveLocation == "Archívum"){
        footer.innerHTML += `<button type="button" class="btn btn-danger" data-bs-dismiss="modal" onclick="TorolFeladat()">Töröl</button>
                             <button type="button" class="btn btn-primary" data-bs-dismiss="modal" onclick="feladatArch(0)">Visszaálít</button>`
        
        footer.children[0].addEventListener("click", () => TorolFeladat());
        footer.children[1].addEventListener("click", () => feladatArch(0));
    }
    
    footer.innerHTML += `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Bezárás</button>`
    
    if(call_setModal) setModalContent(feladatAdatai, felhasznalo)   
}

function TorolFeladat(){//PR?
    document.getElementById(`thisDivHasAnIdOf${feladatAdatai.id}`).remove();// kill the div
    ajax_post("/feladatTorol", 1, { id: feladatAdatai.id })                     // update database
    talalatSzam.innerHTML = parseInt(talalatSzam.innerHTML)-1             // reduce count
}