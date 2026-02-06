/* ------ CONTENT ------
task_scripts/load.js ---------------
    - uploadSubtaskFile         -BBB
    - saveTask                  -BBB, PR 
    - isCompleteSubtask         -BBB
    - getDeletedTasks           -BBB
    - uploadTasks               -BBB
    - validateTaskInputs        -BBB
    - createTaskPayload         -BBB
    - createSubtaskObjects      -BBB
    - uploadFile                -BBB
    - resetCreateNewTask        -PR
    - createSubtask             -PR+
    - buildFakeFileInput        -PR
    - subtaskDelete             -PR

    - updateTask                -PR
    - archiveTask               -PR
    - editThisFeladat           -PR
    - AlfFileChanged            -PR
    - CancelEditingThisFeladat  -PR
    - TorolFeladat              -PR?
    - bookmarkTaskClick         -RD
*/

// BENETT: Merge uploadFile and uploadSubtaskFile

function progressTemplateBuild(id, infoText) {
    let uploadDiv = document.createElement('div');
    uploadDiv.setAttribute("id", id)
    uploadDiv.className = "mb-2 w-100";

    let progressDiv = document.createElement('div');
    progressDiv.className = "progress";

    let progressBar = document.createElement('div');
    progressBar.className = "progress-bar progress-bar-striped progress-bar-animated"
    progressBar.setAttribute("role", "progressbar");
    progressBar.style.width = "0%";
    progressBar.setAttribute("aria-valuenow", "0");
    progressBar.setAttribute("aria-valuemin", "0");
    progressBar.setAttribute("aria-valuemax", "100");

    let infoSpan = document.createElement('span');
    infoSpan.className = "me-2";
    infoSpan.textContent = infoText;

    progressDiv.appendChild(progressBar);

    let hr = document.createElement('hr');
    hr.className = "w-75 mx-auto";

    uploadDiv.appendChild(infoSpan)
    uploadDiv.appendChild(progressDiv);
    uploadDiv.appendChild(hr);

    return uploadDiv;
}

class ProgressBar { //BBB
    constructor(fileName) {
        this.progress = 0;
        this.id = `${crypto.randomUUID()}-upload`;
        this.fileName = fileName;

        this.span = null;
        this.bar = null;
    }

    start() {
        const modalId = document.getElementById("uploadProgressModal");
        let progressBarModal = bootstrap.Modal.getInstance(modalId);
        if(progressBarModal == null) {
            progressBarModal = new bootstrap.Modal(modalId);
        }

        progressBarModal.show();

        document.querySelector("#uploadProgressBody").appendChild(
            progressTemplateBuild(this.id, `${this.fileName} - ${this.progress}%`));
        
        this.span = $(`#${this.id} span`)[0];
        this.bar = $(`#${this.id} .progress-bar`)[0];
    }

    updateProgress(value) { // ez lesz meghívva az xhr callback-kel
        this.span.textContent = `${this.fileName} - ${value}%`;
        this.bar.setAttribute("aria-valuenow", value);
        this.bar.style.width = `${value}%`;

        this.progress = value;

        if (value >= 100) {
            this.span.textContent = `${this.fileName} - Feltöltve`; //ok
            $(`#${this.id}`).remove();
            
            
            if ($("#uploadProgressBody").children().length === 0) {
                $("#uploadProgressBody").innerText = `<h6 class="display6">Minden fájl feltöltve!</h6>`

                const progressBarModal = bootstrap.Modal.getInstance(document.getElementById("uploadProgressModal"));

                setTimeout(() => {
                    $("#uploadProgressBody").empty();
                    progressBarModal.hide();
                }, 500);
            }
            
        }
    } 
}

class ContinousProgressBar {
  constructor() {
    this.minProgress = 0;
    this.maxProgress = 100;
    this.progress = this.minProgress;

    this.id = `${crypto.randomUUID()}-continous`;
    this.running = true;

    this.bar = null;
    this.timer = null;
  }

  start() {
    const modalEl = document.getElementById("uploadProgressModal");
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) modal = new bootstrap.Modal(modalEl);
    modal.show();

    progressTemplateBuild();

    document.querySelector("#uploadProgressBody").appendChild(
            progressTemplateBuild(this.id, `Közzétevés...`));

    this.bar = document.getElementById(`${this.id}`).querySelector('.progress-bar');

    const tick = () => {
      if (!this.running) {
        clearInterval(this.timer);
        this.timer = null;

        $(`#${this.id}`).remove();

        if ($("#uploadProgressBody").children().length === 0) {
          const m = bootstrap.Modal.getInstance(modalEl);
          $("#uploadProgressBody").empty();
          m?.hide();
        }
        return;
      }

      this.progress = (this.progress + 10) % (this.maxProgress + 10); // 0..100..0
      const value = Math.floor((this.progress / this.maxProgress) * 100);

      this.bar.setAttribute("aria-valuenow", value);
      this.bar.style.width = `${value}%`;
    };

    this.timer = setInterval(tick, 250);
  }

  remove() {
    this.running = false;
  }
}


async function uploadSubtaskFile(fajlInput) {//BBB
    const form = new FormData();
    const file = fajlInput.files[0];
    form.append('fajl', file);

    return new Promise((resolve, reject) => {
        $.ajax({
            url: '/ment-fajl',
            method: 'POST',
            data: form,
            processData: false,
            contentType: false,
            xhr: function() {  // feltöltési progress bar logika
                const xhr = new window.XMLHttpRequest();
                const progressBar = new ProgressBar(file.name);
                progressBar.start();

                xhr.upload.addEventListener("progress", function(event) {
                    if (event.lengthComputable) {
                        const percentComplete = Math.min(
                            100,
                            Math.round((event.loaded / event.total) * 100)
                        );
                        progressBar.updateProgress(percentComplete);
                    } else {
                        progressBar.updateProgress(100); 
                    }
                })

                xhr.addEventListener("load", () => {
                    progressBar.updateProgress(100);
                });

                return xhr;
            },
            success: function(res) {
                resolve(res.id ?? null);
            },
            error: function(xhr, status, error) {
                reject(xhr.responseText || error || "Upload failed");
            }
        });
    });
}

async function saveTask(isUjFeladat, feladatId, felhasznalo) {
    const containerId = isUjFeladat ? 'alfeladatBox' : 'alfeladatokContainer'; // új feladat vagy egy meglévő szerkesztése
    const slimMode = slim_felAdd ? '-s' : ''; // slim mód

    let feladatData = {
        Nev: getField("feladatNev" + slimMode, containerId),
        Leiras: getField("leiras" + slimMode, containerId),
        Evfolyam: getField("evfolyam" + slimMode, containerId),
        Tantargy: getField("tantargy" + slimMode, containerId),
        Tema: getField("tema" + slimMode, containerId),
        Nehezseg: Math.min(getField("nehezseg" + slimMode, containerId) || 5, 10),
    };

    if (!validateTaskInputs(feladatData)) {
        toastMsg("Feladat nem menthető!", "A összes mezőt ki kell tölteni.", "warning");
        return;
    }

    let alfeladatok = await createSubtaskObjects(isUjFeladat, slimMode, containerId);

    let deletedFeladatok = getDeletedTasks();
    if (deletedFeladatok.length > 0) {
        alfeladatok = alfeladatok.concat(deletedFeladatok);
    }

    alfeladatok = alfeladatok.filter(f => isCompleteSubtask(f));

    const payload = createTaskPayload(feladatData, alfeladatok, isUjFeladat);

    uploadTasks(payload, isUjFeladat, feladatId, felhasznalo);
}

function isCompleteSubtask(alfeladat) { //BBB
    return !((alfeladat.leiras === "" || alfeladat.leiras === null) &&
           (alfeladat.pontszam === "" || alfeladat.pontszam === null));
}

function getDeletedTasks() { //BBB
    try {
        if (Array.isArray(deleteIds) && deleteIds.length > 0) {
            return deleteIds.map(id => (
                { 
                    isDelete: true, 
                    alfId: id 
                }
            ));
        }
    } catch (err) {
        // hiba esetén üres tömb visszaadása
        return [];
    }

    return [];
}

function uploadTasks(payload, ujFeladat, feladatId, felhasznalo) { //BBB
    $.ajax({
        url: '/ment-feladat',
        method: "POST",
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (res) {
            if (ujFeladat) {
                loadPageData();
                toastMsg("Feladat hozzáadva!", "A feladat hozzáadódott az adatbázishoz.", "success");
            } else {
                updateTask(payload, payload.alfeladatok.filter(a => !(a["isDelete"])), felhasznalo); 
                toastMsg("Feladat frissítve!", "A feladat frissítése sikeres volt.", "info");
            }
        },
        error: function (xhr) {
            console.error('hiba feladat feltöltésekor:', xhr.responseText);
            showErrorMsg('hiba feladat feltöltésekor');
            toastMsg("Valami borzasztó dolog történt!", "Nem sikerült végrahajtani a műveletet.", "danger");
        }
    });
    resetCreateNewTask(feladatId, felhasznalo);
}

function validateTaskInputs(feladatData) {//BBB
    return Object.values(feladatData).every(value => value !== "");
}

function createTaskPayload(feladatData, alfeladatok, ujFeladat) {//BBB
    return {
        "Nev":      feladatData.Nev,
        "Leiras":   feladatData.Leiras,
        "Evfolyam": feladatData.Evfolyam,
        "Tantargy": feladatData.Tantargy,
        "Tema":     feladatData.Tema,
        "Nehezseg": Math.min(feladatData.Nehezseg, 10),
        "kurzusNeve": null,
        "tanarId": CurrentUserData.id,
        "alfeladatok": alfeladatok,
        "alfDb": alfeladatok.length,
        "isInsert": ujFeladat ? 1 : 0,
        "id": feladatAdatai.id || null
    };
}

async function createSubtaskObjects(ujFeladat, slimMode, containerId) {//BBB

    let alfeladatok = [];
    let items;

    if (ujFeladat) {
        items = $(`#${containerId}${slimMode}`)
            .find(".alf_id")
            .toArray();
    } else {
        /*items = document.getElementById(containerId)
            .querySelectorAll(".alfeladat");*/

        items = Array.from(
            document.getElementById(containerId)
                .querySelectorAll(".alfeladat")
        );
    }
    
    const alfeladatPromises = items.map(
        item => uploadFile(
            $(item).find(".alfeladatFile")[0]
        )
    );

    const fajlIds = await Promise.all(alfeladatPromises);

    items.forEach((item, index) => {
        const $item = $(item);

        const leiras = $item.find(".alfeladatLeiras")[0].value || null;
        const pontszam = $item.find(".alfeladatPont")[0].value || null;
        const alfId = /*$item.find(".alfeladat").prevObject[0].id.substring(3) || */item.children[0].id.substring(15) || null;

        alfeladat = {
            leiras,
            pontszam,
            fajlId: fajlIds[index],
            isDelete: false,
            alfId: alfId || null,
        }
        alfeladatok.push(alfeladat);
    });

    return alfeladatok;
}

function uploadFile(fileInput) {//BBB
    const existingId = fileInput?.dataset.fileId ?? null;
    const hasNewFile = Boolean(fileInput && fileInput.files && fileInput.files.length > 0);

    if (hasNewFile) {
        return uploadSubtaskFile(fileInput);
    } else if (existingId) {
        return Promise.resolve(existingId);
    } else {
        return Promise.resolve(null);
    }
}

function resetCreateNewTask(feladatId, felhasznalo, felhasznaloColor){ //PR
    console.log("resetcreate")
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

    let container = document.getElementById(feladatId);

    console.log(felhasznalo); 
    if (felhasznalo){ $bind(container, 'felhasznaloName').textContent = felhasznalo; }

  /*if (feladatId && felhCircleOrig && felhNameOrig) {
        console.log("original beszur")
        let felhCont = document.getElementById(feladatId);
        let felhRow = $bind(felhCont, "felhasznaloRow");
        
        $bind(felhRow, "felhasznaloCircle").innerText = felhCircleOrig;
        $bind(felhRow, "felhasznaloName").innerText = felhNameOrig;
    }*/
}

function createSubtask(where){ //PR
    //creates a new subtask box
    const subtask = subtaskCardTemplate()
    subtask.id = `div${pId}`

    const button = $bind(subtask, 'removeButton')
    button.addEventListener('click', () => subtaskDelete(subtask.id));

    const input = subtask.querySelector('.alfeladatPont')
    input.addEventListener('input',() => checkNumber(input))

    const fakeFile = buildFakeFileInput(pId) 

    subtask.children[0].appendChild(fakeFile)
    document.getElementById(where).appendChild(subtask);
    pId++;
}

function buildFakeFileInput(id, fileName, fileIdentifier){ //PR
    const fakeFile = fakeFileTemplate()

    const label = fakeFile.children[0]
    const text = fakeFile.children[1]
    const input = fakeFile.children[2]

    label.setAttribute("for", input.id);
    
    label.id = `fakeFileButton${id}`
    text.id = `fakeFileText${id}`
    input.id = `alfFile${id}`

    if(fileIdentifier) input.dataset.fileId = String(fileIdentifier)
    if(fileName) text.textContent = fileName //show existing file name (if any)

    label.setAttribute("for", `alfFile${id}`);
    input.addEventListener('change', () => {
        AlfFileChanged(input, `fakeFileText${id}`); 
        checkFileSize(input, `fakeFileText${id}`)
    })
    return fakeFile
}

function subtaskDelete(id){//PR
    const parent = document.getElementById(`${id}`).parentElement
    parent.replaceChildren()
    parent.remove(); 
}

function updateTask(task, subtasks, felhasznalo){//PR
    // update the task with the new data
    feladatAdatai = {
        id: task.id, 
        Nev: task.Nev, 
        Leiras: task.Leiras, 
        Tantargy: task.Tantargy, 
        Tema: task.Tema, 
        Evfolyam: task.Evfolyam, 
        Nehezseg: task.Nehezseg, 
        alfDb: subtasks.length
    }

    var szin = 'rgb(127,127,127)'; // fallback
    try{
        var cont = document.getElementById('task-' + feladatAdatai.id)
        var cir = $bind(cont, 'felhasznaloCircle')
        szin = cir.style.backgroundColor;
    } 
    catch(err){console.log(err)}

    const container = buildTaskCardPrimaryData(feladatAdatai, felhasznalo, szin, null)
    document.getElementById(`task-${task.id}`).replaceChildren(container.querySelector('div'))         
    
    CancelEditingThisFeladat(true, '', `task-${task.id}`); // and stop the editing process
    toastMsg('Sikeres módosítás!', 'Feladat sikeresen módosítva', 'success');
}

function archiveTask(state){  //PR
    talalatSzam.innerHTML = parseInt(talalatSzam.innerHTML)-1 
    
    ajax_post("/feladatArchivalas", 1, { id: feladatAdatai.id, state: state })
    document.getElementById(`task-${feladatAdatai.id}`).remove(); 
    toastMsg('Sikeres módosítás!', 'Feladat sikeresen archiválva', 'success');

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

function editThisFeladat(feladatId, felhasznalo){ // PR
    let feladatContainer = document.getElementById(feladatId);
    let felhasznaloRow = $bind(feladatContainer, "felhasznaloRow");

    let felhasznaloCircle = $bind(felhasznaloRow, "felhasznaloCircle");

    console.log('felhasznaloCircle', felhasznaloCircle)

    // replace the text with input fields
    console.log("szekesztes")
    deleteIds = [];
    let o = {'0': {id: 'feladatNevEdit', value: feladatAdatai.Nev ?? ""}}
    addTextInputTo(editFeladat.querySelectorAll(".modal-header"), o)

    document.querySelector("#alfeladatokContainer .nincsen")?.remove();

    const spans = modalFeladatContent.querySelectorAll("span")
    o = {
        '0': {id: 'tantargyEdit', value: feladatAdatai.Tantargy ?? ""},
        '1': {id: 'temaEdit',     value: feladatAdatai.Tema ?? ""},
        '2': {id: 'evfolyamEdit', value: feladatAdatai.Evfolyam ?? ""},
        //'5': {id: 'leirasEdit',   value: feladatAdatai.Leiras ?? ""}
    }
    addTextInputTo(spans, o)

    const leiras = document.createElement('textarea')
    leiras.style.resize = 'none'; leiras.type = 'text'
    leiras.classList.add('form-control')
    leiras.id = 'leirasEdit'
    leiras.value = feladatAdatai.Leiras ?? ""
    spans[5].replaceChildren(leiras)

    spans[2].firstChild.setAttribute('inputmode', 'numeric')
    spans[2].firstChild.addEventListener('input', () => checkNumber(spans[2].firstChild), maxEvfolyamValue)


    const {nehLabel, nehInput} = returnEditNehezsegSlider()
    NehezsegSliderPlace.replaceChildren(nehLabel)
    NehezsegSliderPlace.appendChild(nehInput)


    document.getElementById("HozzaadGoesHere").innerHTML = 
                                    `<div class="w-100">
                                        <button class="btn d-flex text-dark align-items-center btn-light mx-auto">
                                            <i class="bi bi-plus-circle fs-5 me-2"></i>
                                            <span>Alfeladat Hozzáadása</span>
                                        </button>
                                    </div>`
    document.querySelector("#HozzaadGoesHere button").addEventListener('click', () => createSubtask('alfeladatokContainer'))

    var db
    for (db = 0; db < editFeladat.querySelectorAll(".alfeladat").length; db++) {
        let thisOne = editFeladat.querySelectorAll(".alfeladat")[db]
        let alfeladatPlaceholderek = Array.from(thisOne.querySelectorAll("div span"))

        let fileName = alfeladatPlaceholderek[2].querySelector(".uploadedFileName")?.textContent || "Nincs fájl kiválsztva"
        let fileIdentifier = $bind(thisOne, 'alfeladatFajl')?.children[0]?.dataset.fileId || null
         
        var alfId = thisOne.querySelector("div").id.substring(15);
        thisOne.querySelector(".deleteButtonGoesHere").appendChild(buildDeleteButton(alfId))
        
        
        thisOne.querySelectorAll("p")[0].innerHTML = `<span><strong>Pont:</strong><input type="text" class="form-control alfeladatPont"></span>`;
        thisOne.querySelectorAll("p")[0].querySelector('input').value = alfeladatPlaceholderek[0].textContent


        const spans = thisOne.querySelectorAll("span")
        const inp = document.createElement('input')
        inp.type = 'text'; inp.classList.add('form-control', 'alfeladatLeiras')
        inp.value = alfeladatPlaceholderek[1].textContent

        spans[1].replaceChildren(inp);

        spans[2].classList.remove('d-none')
        spans[2].replaceChildren(buildFakeFileInput(db, fileName, fileIdentifier)) // replace the file input with a fake, because you cant set its value  
    }
    const footer = editFeladat.querySelector(".modal-footer")
    footer.innerHTML = `<button type="button" class="btn btn-primary">
                            <i class="bi bi-check-lg"></i>&nbsp;
                            Mentés
                        </button>
                        <button type="button" class="btn btn-warning">
                            <i class="bi bi-x"></i>&nbsp;
                            Mégse
                        </button>`

    footer.children[0].addEventListener('click', () => { saveTask(
        false,
        feladatId,
        felhasznalo),
        resetCreateNewTask(
        feladatId,
        felhasznalo,
    )})
    footer.children[1].addEventListener('click', () => CancelEditingThisFeladat(
        true, 
        felhasznalo, 
        feladatId, 
    ));
}

function buildDeleteButton(id){
    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('btn', 'text-danger')

    const i = document.createElement('i')
    i.classList.add('bi', 'bi-x-circle', 'fs-4')
    button.appendChild(i)

    button.addEventListener('click', () => {
            deleteIds.push(id); subtaskDelete(`ThisIsAlfeladat${id}`)})
    
    return button
}

function AlfFileChanged(fileInput, id) {//PR
    let text = document.getElementById(id) //fake file name
    let def = text.innerText // the text pre upload
    
    if (fileInput.files.length > 0) { // successful upload
        text.innerText = fileInput.files[0].name; //update name
    } else {            // faliure
        text.innerText = def; // keep default
    }
}

function CancelEditingThisFeladat(call_setModal, felhasznalo, feladatId){ //PR 
    // set teh input fields back to texts and change the buttons
    const footer = editFeladat.querySelector(".modal-footer")
    const header = editFeladat.querySelector(".modal-header")

    
    
    const h5 = document.createElement('h5')
    h5.classList.add('modal-title', 'fw-semibold')
    h5.id = 'feladatCime'
    h5.textContent = feladatAdatai.Nev
    header.replaceChildren(h5)
    footer.replaceChildren()
    if(document.getElementById("hozzaadGoesHere")) document.getElementById("HozzaadGoesHere").innerHTML = "" 
    
    if(ActiveLocation == "Feladataim" || ActiveLocation == 'Csillagozva' || ActiveLocation == "Általam megosztott") {
        header.innerHTML += `<button class="btn"><i class="bi bi-pencil-square fs-5"></i></button>`
        if (ActiveLocation != "Általam megosztott")
                footer.innerHTML = `<button type="button" class="btn btn-warning" data-bind="arch" data-bs-dismiss="modal">
                                <i class="bi bi-archive-fill"></i>&nbsp;
                                Archiválás
                            </button>
                            <button type="button" class="btn btn-primary" data-bind="megoszt" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#megosztFeladat">
                                <i class="bi bi-share-fill"></i>&nbsp;
                                Megosztás
                            </button>`


        let taskDiv = document.getElementById(feladatId);
        let felhasznalo = $bind(taskDiv, "felhasznaloName").innerText;

        header.children[1].addEventListener("click", () => editThisFeladat(feladatId, felhasznalo));
        $bind(footer, 'arch')?.addEventListener("click", () => archiveTask(1));
        $bind(footer, 'megoszt')?.addEventListener("click", () => autocompleteShare_TeacherSelect());
    }
    
    if (ActiveLocation == "Archívum"){
        footer.innerHTML += `<button type="button" class="btn btn-danger" data-bs-dismiss="modal">
                                <i class="bi bi-x"></i>&nbsp;
                                Töröl
                             </button>
                             <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                                 <i class="bi bi-x"></i>&nbsp;                        
                                 Visszaálít
                             </button>`
        
        footer.children[0].addEventListener("click", () => TorolFeladat());
        footer.children[1].addEventListener("click", () => archiveTask(0));
    }
    
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.classList.add('btn', 'btn-secondary')
    btn.setAttribute('data-bs-dismiss', 'modal')
    btn.textContent = 'Bezárás'

    document.getElementById(feladatId)

    footer.appendChild(btn)
    
    if(call_setModal) setTaskModalContent(feladatAdatai, felhasznalo);
}

function TorolFeladat(){//PR?
    document.getElementById(`task-${feladatAdatai.id}`).remove();           // remove the div
    ajax_post("/feladatTorol", 1, { id: feladatAdatai.id })                 // update database
    talalatSzam.innerHTML = parseInt(talalatSzam.innerHTML) - 1;            // reduce count
    toastMsg('Sikeres módosítás!', 'Feladat sikeresen törölve', 'success');
}

function bookmarkTaskClick(feladatId, button, dataset){
    button.classList.toggle('text-warning')
    button.classList.toggle('bi-star-fill')
    button.classList.toggle('bi-star')
    let oldal = Object.keys(AvailablePages).indexOf(ActiveLocation).toString()
    ajax_post(`/updateBookmarkedState`, 1, {feladatId: feladatId, oldal: oldal, felado: dataset.felhasznalo})
    toastMsg('Sikeres módosítás!', 
        button.classList.contains('bi-star-fill') ? 'Feladat sikeresen csillagozva' : 'Feladat sikeresen kicsillagozva', 
        'success');
}