function taskCardTemplate(){//PR
    const div = document.createElement('div');
    div.classList.add('feladatDiv', 'col-12', 'col-sm-6', 'col-md-4', 'col-lg-3', 'col-xl-2', 'p-2', 'm-0');
    div.innerHTML = `<div class="card h-100" data-bind="card" data-bs-toggle="modal" data-bs-target="#editFeladat">
                        <div class="card-body d-flex flex-column">

                            <div class="d-flex justify-content-between">
                                <h5 class="card-title text-overflow-hidden" data-bind="nev"></h5>
                                <i class="d-none bi bi-star fs-5" data-bs-toggle="modal" data-bind="bookmarkTaskButton"></i>
                            </div>
                            
                            <div class="d-none d-flex align-items-center mb-2 p-1 card-text" data-bind="felhasznaloRow">
                                <h6 class="mb-0 d-flex align-items-center">Tanár:</h6>
                                <div class="btn mx-1 rounded-circle border-0 d-inline-flex align-items-center justify-content-center"
                                    style="width:24px;height:24px;" data-bind="felhasznaloCircle">
                                </div>
                                <span class="text-truncate" data-bind="felhasznaloName"></span>
                            </div>

                            <h6 class="d-none mb-2 p-1 card-text" data-bind="kurzusRow">Kurzus: <span data-bind="kurzusName"></span></h6>

                            <p class="mb-1 p-1 card-text"><strong>Tantárgy:</strong> <span data-bind="tantargy"></span></p>
                            <p class="mb-1 p-1 card-text"><strong>Téma:</strong> <span data-bind="tema"></span></p>
                            <p class="mb-1 p-1 card-text"><strong>Évfolyam:</strong> <span data-bind="evfolyam"></span></p>
                            <p class="mb-1 p-1 card-text"><strong>Nehézség:</strong> <span data-bind="nehezseg"></span></p>
                            <p class="mb-1 p-1 card-text my-3"><strong>Leírás:</strong> <span data-bind="leiras"></span></p>

                            <p class="mb-1 p-1 card-text" data-bind="alfDb"></p>

                            <button class="d-none btn btn-sm btn-light btn-outline-secondary text-dark"
                                    data-bind="postBtn" data-bs-toggle="modal" data-bs-target="#shareFeladat">
                                közzétevés
                            </button>
                            <button class="d-none btn btn-sm btn-light btn-outline-secondary text-dark"
                                    data-bind="visszaBtn" data-bs-toggle="modal">
                                visszavonás
                            </button>
                        </div>
                    </div>`

    return div;
}

function taskModalTemplate(){//PR
    const content = `<p class="mb-1 felAdat"><strong>Tantárgy:</strong> <span class="tantargyEdit" data-bind="tantargy"></span></p>
                    <p class="mb-1 felAdat"><strong>Téma:</strong> <span class="temaEdit" data-bind="tema"></span></p>
                    <p class="mb-1 felAdat num"><strong>Évfolyam:</strong> <span class="evfolyamEdit" data-bind="evfolyam"></span></p>
                    <span id="NehezsegSliderPlace" class="mb-3">
                        <p class="mb-2"><strong>Nehézség:</strong> <span class="nehezsegEdit" data-bind="nehezseg"></span>/10</p>
                    </span>

                    <p class="mb-1 felAdat my-3"><strong>Leírás:</strong> <span class="leirasEdit" data-bind="leiras"></span></p>

                    <div class="d-flex align-items-center mb-2" id="HozzaadGoesHere"></div>
                    <div id='alfeladatokContainer' class="overflow bg-alfeladatBox rounded d-grid gap-2" style="max-height:40vh" data-bind="alfeladatokList">
                        
                    </div>`;
    return content;
}

function taskModal_AlfeladatTemplate(){//PR
    const div = document.createElement('div')
    div.classList.add('p-1', 'alfeladat')
    div.innerHTML = `<div class="alfId, m-2">
                        <div class="d-flex mt-0 deleteButtonGoesHere align-items-center justify-content-between fw-semibold">
                            <h6 class="mt-auto mb-3">Alfeladat</h6>
                        </div>
                        <p class="mb-1"><span class="alfeladatPont" data-bind="alfeladatPont"></span> pont</p>
                        <p class="mb-1"><strong>Leírás:</strong> <span class="alfLeiras" data-bind="alfeladatLeiras"></span></p>
                        <span data-bind="alfeladatFajl">
                            <div class="mb-2">
                                <div class=" border border-secondary rounded p-2 d-flex align-items-center gap-3">
                                    <div class="d-flex align-items-center justify-content-center" style="width:48px; height:48px; flex:0 0 48px;"data-bind="fajlIkon">
                                        
                                    </div>

                                    <div class="flex-grow-1 overflow-hidden">
                                        <div class="fw-semibold text-truncate d-small uploadedFileName" style="max-width: 100%;" data-bind="fajlNev">
                                            
                                        </div>
                                        <div class="text-muted small" data-bind="fajlMeret">Méret: </div>
                                    </div>

                                    <div class="ms-2" style="flex:0 0 auto;" data-bind="fajlLetoltes">
                                        <a target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary">Fájl letöltése</a>
                                    </div>
                                </div>
                            </div>
                        </span>
                    </div>
                   `; //<hr class="w-100">
    return div
}

function subtaskCardTemplate(){//PR
    const div = document.createElement("div");
    div.classList.add('card', 'm-2', 'alfeladat', 'alf_id')
    div.innerHTML = `<div class="card-body">
                        <div class="d-flex mt-0 deleteButtonGoesHere align-items-center justify-content-between fw-semibold">
                            <h6 class="mt-auto mb-3">Alfeladat</h6>
                            <button class="btn text-danger" data-bind="removeButton">
                                <i class="bi bi-x-circle fs-4"></i></button>
                        </div>
                        <p class="mb-1"><strong>Pont:</strong>
                        <input class="form-control alfeladatPont" type="text" maxlength="100" inputmode="numeric" placeholder="Pontszám"></p>
                        <p class="mb-1"><strong>Leírás:</strong>
                        <input class="form-control alfeladatLeiras" type="text" maxlength="10000" placeholder="Leírás"></p>                
                    </div>`;
    return div
}

function fakeFileTemplate(){//PR
    const div = document.createElement("div");
    div.classList.add('file-wrapper', 'd-flex', 'align-items-center')
    div.innerHTML = `<label class="btn btn-white fakeFileButton">Fájl kiválasztása</label>
                    <span class="fakeFileText">Nincs kiválasztva</span>

                    <input type="file" class="d-none form-control alfeladatFile">`
    return div
}

function reportTemplate(){//BBB
    const div = document.createElement('div')
    div.classList.add('col', 'p-1')
    div.innerHTML = `<div class="card m-1 p-0 rounded d-flex flex-column">
                        <div class="m-0 p-3 border-bottom border-secondary-subtle">
                            <h6 class="m-0" data-bind="reportInfo"></h6>
                        </div>
                        <div class="m-0 p-3">
                            <div class="row mb-4">
                                <div class="col-lg-6">
                                    <h6>Hibajelenség</h6>
                                    <hr>
                                    <p class="word-wrap" id="reportMessage"></p>
                                </div>
                                <div class="col-lg-6">
                                    <h6>Adatok</h6>
                                    <hr>
                                    <p class="text-muted text-nowrap text-overflow-hidden">
                                        <strong>E-Mail: </strong>
                                        &nbsp;
                                        <span id="reportMail"></span>
                                    </p>
                                    <p class="text-muted text-nowrap text-overflow-hidden">
                                        <strong>Név: </strong>
                                        &nbsp;
                                        <span id="reportName"></span>
                                    </p>
                                </div>
                            </div>
                        
                            <div class="row w-100 mx-auto" data-bind="buttons">
                            
                            </div>
                        </div>
                    </div>`
    return div
}

function databasePageTemplate(){//BBB, PR
    const div = document.createElement('div')
    div.classList.add('container-fluid', 'h-100')
    div.innerHTML = `<div class="container-fluid bg-light p-3 rounded">
                        <div class="container-md mx-auto">
                            <div class="row" id="IntezmenyOptions">
                                <div class="col-12 col-md-4 mb-2">
                                    <label class="btn w-100 btn-light border border-secondary py-2 text-nowrap overflow-hidden" id="I_Hozzaad_Option" for="I_Hozzaad"><i class="bi bi-plus-lg"></i>&nbsp;Intézmény hozzáadása</label>
                                    <input class="btn-check" name="IntRadio" type="checkbox" id="I_Hozzaad">
                                </div>
                                <div class="col-12 col-md-4 mb-2">
                                    <label class="btn w-100 btn-light border border-secondary py-2 text-nowrap overflow-hidden" id="I_Modosit_Option" for="I_Modosit"><i class="bi bi-pencil"></i>&nbsp;Intézmény módosítása</label>
                                    <input class="btn-check" name="IntRadio" type="checkbox" id="I_Modosit">
                                </div>
                                <div class="col-12 col-md-4 mb-2">
                                    <label class="btn w-100 btn-light border border-secondary py-2 text-nowrap overflow-hidden" id="I_Torol_Option" for="I_Torol"><i class="bi bi-eraser"></i>&nbsp;Intézmény törlése</label>
                                    <input class="btn-check" name="IntRadio" type="checkbox" id="I_Torol">
                                </div>
                            </div>
                        
                            <div id="currentDatabaseOption" class="w-100 justify-content-center"></div>
                        </div>
                    </div>
                
                    <div class="container-fluid bg-light mt-3 px-0 py-3 rounded">
                        <div class="p-4 border-bottom border-light-subtle text-center">
                            <h1 class="display-6">Adatbázis Kezelés</h1>
                        </div>

                        <div class="container-fluid row mx-auto p-2">
                            <div class="col-lg-6 mt-3 d-flex flex-column">
                                <textarea id="sql-input" class="form-control" size="5"></textarea>
                                
                                <div class="d-flex justify-content-end m-2">
                                    <div class="col-md-4 col-sm-6">
                                        <button data-bind="sqlBtn" class="btn btn-primary w-100">
                                            <i class="bi bi-gear-fill"></i> Futtatás...
                                        </button>
                                    </div>
                                </div>
                                
                                <strong><p id="sql-error" class="text-danger"></p></strong>

                                <hr class="mt-auto">

                                <div class="mt-auto">
                                    <div class="row g-2">
                                        <div class="col-12 col-md-6">
                                            <button type="button" data-bind="backupMentBtn" class="btn btn-warning w-100">
                                                <i class="bi bi-hdd-stack-fill"></i> Backup készítése...
                                            </button>
                                        </div>
                                    </div>

                                    <div class="row g-2 mt-1">
                                        <div class="col-12 col-md-6">
                                            <button type="button" data-bs-toggle="modal" data-bs-target="#BiztosBackup" class="btn btn-warning w-100">
                                                <i class="bi bi-hdd-stack-fill"></i> Backup betöltése...
                                            </button>
                                        </div>
                                        <div class="col-12 col-md-6">
                                            <select id="backupSelect" class="form-select w-100"></select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-lg-6 mt-3">
                                <div class="bg-dark rounded border p-2" style="overflow: auto; height: 50vh!important;">
                                    <table id="sql-table" class="table table-striped table-light d-none mb-0" style="overflow: hidden; height: 50vh!important;">
                                        <thead>
                                            <tr id="headers"></tr>
                                        </thead>
                                        <tbody id="sql-data"></tbody>
                                    </table>

                                    <div id="sql-placeholder" class="text-center my-auto pt-5" style="height: 50vh!important;">
                                        <h1 class="display-6">Nincs megjelenítendő adat</h1>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`
    return div

}

function hibajelentesFoadminTemplate(){
    const div = document.createElement('div')
    div.classList.add('container-fluid', 'mx-auto', 'bg-light', 'border-light', 'p-0', 'rounded', 'd-flex', 'flex-column')
    div.innerHTML = `<div class="m-0 p-3 border-bottom border-secondary-subtle">
                        <h6 class="m-0"><i class="bi bi-exclamation-triangle-fill"></i> Hibajelentések listája</h6>
                    </div>
                    <div class="d-md-flex justify-content-evenly">

                        <div class="p-2 w-100">
                            <button type="button" id="nemjavitott" class="btn btn-outline-warning active overflow-hidden text-nowrap w-100" data-bs-toggle="button" autocomplete="off">
                                <i class="bi bi-x"></i>&nbsp;
                                Nem javított
                            </button>
                        </div>
                        <div class="p-2 w-100">
                            <button type="button" id="javitott" class="btn btn-outline-secondary overflow-hidden text-nowrap w-100" data-bs-toggle="button" autocomplete="off">
                                <i class="bi bi-check-lg"></i>&nbsp;
                                Javított
                            </button>
                        </div>
                    </div>
                    <div class="m-0 my-2 p-0 row row-cols-1 row-cols-lg-2 row-cols-xxl-3" id="reportContainer"></div>`
    return div
}

function hibajelentesDefaultTemplate(){
    const div = document.createElement('div')
    div.classList.add('container-fluid', 'mx-auto', 'bg-light', 'border-light', 'p-3', 'rounded', 'shadow', 'd-flex', 'flex-column')
    div.style += "backdrop-filter: blur(5px); height: 70vh; overflow: hidden;"
    div.innerHTML = `<div class="row flex-grow-1 h-100">
                        <div class="col-md-4 d-flex flex-column">
                            <h3><i class="bi bi-info-circle-fill"></i>&nbsp;Felhasználó adatai</h3>
                            <hr>
                            <div class="row">
                                <div class="col-md-auto">
                                    <p class="text-break"><span class="fw-bold">Email:</span> <span id="feedback-email"></span></p>
                                </div>
                                <div class="col-md-auto">
                                    <p class="text-break"><span class="fw-bold">Név:</span> <span id="feedback-nev"></span></p>
                                </div>   
                                <p class="text-muted text-break"><i class="bi bi-exclamation-triangle-fill"></i>&nbsp;Ezek az adatok <span class="fw-bold">rögzítésre fognak kerülni,</span> mert egy üzenettel fogjuk önnel közölni a hibajelenség sikeres javítását.</p>
                            </div>
                        </div>

                        <div class="col-md-8 d-flex flex-column" style="overflow-y: auto;">
                            <div class="container-fluid">
                                <h3><i class="bi bi-bug-fill"></i>&nbsp;Hibajelentés</h3>
                            </div>
                            <hr>
                            <form id="feedback-form" class="needs-validation d-flex flex-column h-100">
                                <div class="mb-3 d-flex flex-column flex-grow-1">
                                    <label for="hiba-reszletek" class="form-label">Hibajelenség részletei:</label>
                                    <textarea class="form-control flex-grow-1" id="hiba-reszletek"
                                        maxlength="10000" style="resize: none;"></textarea>
                                    <div class="invalid-feedback">Kérem töltse ki a szövegdobozt.</div>
                                </div>

                                
                            </form>
                            <div class="mb-3">
                                <button data-bind="sendBtn" onclick="sendFeedback()" class="btn btn-primary">
                                    <i class="bi bi-send-fill"></i>&nbsp;
                                    Küldés
                                </button>
                            </div>
                            
                        </div>
                    </div>`
    return div
}

function intezmenyDiv1(id, text, type){
    const div1 = document.createElement('div')
    div1.classList.add('col-md-6', 'p-3')

    const lab = document.createElement('label')
    lab.setAttribute('for', id)
    lab.textContent = text
    lab.classList.add('form-label', 'text-muted')

    const inp = document.createElement(type)
    if(type == 'input') inp.type = 'text'
    inp.id = id
    inp.setAttribute('hint', id)
    inp.classList.add('rounded')

    div1.appendChild(lab)
    div1.appendChild(document.createElement('br'))
    div1.appendChild(inp)
    return div1
} 

function intezmenyDiv2(text, mt){
    const div2 = document.createElement('div')
    div2.classList.add('col-md-6', 'p-3', 'align-bottom')

    const innerDiv = document.createElement('div')
    innerDiv.setAttribute('data-bind', 'intClick')
    innerDiv.classList.add('btn', 'p-3', 'btn-warning')
    if (mt) innerDiv.classList.add('mt-3')
    innerDiv.textContent = text

    div2.appendChild(innerDiv)
    return div2
}

function intezmenyOptionTemplate(index){
    const div = document.createElement('div')
    div.classList.add('w-100', 'mx-auto', 'text-center', 'rounded', 'my-4', 'p-3')

    div.innerHTML = `<h1 class="display-6">Intézmény </h1>
                    <hr class="w-75 mx-auto">
                    <div class="row">
                        
                    </div>`
    switch(index){
        case 0: 
            var div1 = intezmenyDiv1('intezmenyMezo', 'Intézmény neve:', 'input')
            var div2 = intezmenyDiv2('Intézmény hozzáadása')

            $bind(div2, 'intClick').addEventListener('click', () => addInstitution())

            div.querySelector('.row').appendChild(div1)
            div.querySelector('.row').appendChild(div2)

            
            break;

        case 1: 
            var div1 = intezmenyDiv1('javitIntezmeny', 'Javítani való intézmény:', 'select')
            div.querySelector('.row').appendChild(div1)

            div1 = intezmenyDiv1('JavitMezo', 'Új intézmény név:', 'input')
            div.querySelector('.row').appendChild(div1)
            

            var div2 = intezmenyDiv2('Intézmény módosítása', true)
            $bind(div2, 'intClick').addEventListener('click', () => editInstitution())

            let newDiv = document.createElement('div')
            newDiv.classList.add('row', 'justify-content-end')
            newDiv.appendChild(div2)
            
            div.appendChild(div2)
            break;

        case 2: 
            var div1 = intezmenyDiv1('deleteInstitution', 'Törölni való intézmény neve:', 'select')
            var div2 = intezmenyDiv2('Intézmény törlése')

            $bind(div2, 'intClick').addEventListener('click', () => addInstitution())

            div.querySelector('.row').appendChild(div1)
            div.querySelector('.row').appendChild(div2)
            break;
    }
                        
    div.firstChild.textContent += ['hozzáadása', 'módosítása', 'törlése'][index]
    return div
}

function nincsAdatTemplate(){
    const div = document.createElement('div')
    div.classList.add('bg-dark', 'border', 'border-dark', 'rounded', 'p-3')
    div.innerHTML = `<span class='text-light h2'>Még nincsenek adatok</span>`
    return div
}

function chartCardTemplate(){
    const div = document.createElement('div')
    div.classList.add('col-12', 'col-lg-6', 'p-2',)
    div.innerHTML = `<div class='card h-100'>
                        <div class='card-body h-100' style="flex: 0 0 auto !important;">
                            <h3 class='card-title text-center'></h3>
                            <div class="chart-wrapper mx-auto mt-2 p-2 align-items-center h-100" style="max-height:30vh">
                                <canvas class='mb-0 mt-auto'></canvas>
                            </div>
                        </div>
                    </div>`
    return div
}

function felhasznaloCardTemplate(){
    const div = document.createElement('div')
    div.classList.add('felhasznaloDiv', 'col-12', 'col-lg-6', 'p-2', 'm-0')
    div.innerHTML = `<div class="card container-fluid h-100 bg-light m-0 p-0">
                        <div class="card-body d-flex flex-column justify-content-center align-items-center">
                            <div class="container-fluid row justify-content-between">
                                <div class="col-lg-4 col-sm-6 col-12 d-flex justify-content-center align-items-center">
                                    <div id="hatter" class="btn btn-lg my-4 mx-0 position-relative rounded-circle border-0" style="aspect-ratio: 1 / 1; max-width: 100px; width: 100%;}">
                                        <div id="letter" class="position-absolute top-50 start-50 translate-middle letter" style="font-size: 2rem;"></div>
                                    </div>
                                </div>
                                <div class="col-lg-8 col-sm-6 col-12" data-bind="userData">

                                    <h4 class="h4 card-text pb-1 mt-4">
                                        <i class="bi bi-person-fill"></i>&nbsp;
                                        <span></span>
                                    </h4>
                                    <p class="fst-italic mb-1 card-text">
                                        <i class="bi bi-at"></i>&nbsp;
                                        <span></span>
                                    </p>
                                    <p class="mb-4 card-text">
                                        <i class="bi bi-shield-shaded"></i>&nbsp;
                                        <span></span>
                                    </p>
                                </div>
                            </div>
                            <hr class="w-75 mx-auto my-1">
                            <div class="container-fluid row p-0" data-bind="buttons">
                                <div class="col-md-6 col-sm-12 ps-0">
                                    <button data-bs-toggle="modal" class="btn m-2 d-flex w-100 rounded border-0 border-light">
                                        Tanár
                                    </button>
                                </div>
                                <div class="col-md-6 col-sm-12 ps-0">
                                    <button data-bs-toggle="modal" class="btn m-2 d-flex w-100 rounded border-0 border-light">
                                        Admin
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>`
    return div
    
}

function loginFormTemplate(){

    const content = `<h3 class="text-center mb-4">Bejelentkezés</h3>
                    <div class="btn btn-primary w-100 mb-3" data-bind="redirect"><i class="bi bi-google"></i> Google fiók használata</div>
                    
                    <div class="w-100 row align-content-center mx-auto mb-3">
                        <div class="col-4 col-sm-5 my-auto bg-secondary relative opacity-50" style="height:1px;"></div>
                        <p class="col-4 col-sm-2 my-auto text-center p-0">vagy</p>
                        <div class="col-4 col-sm-5 my-auto bg-secondary relative opacity-50" style="height:1px;"></div>
                    </div>
                    
                    <div class="mb-3"> 
                        <input type="text" placeholder="Felhasználónév / email" maxlength="320" class="form-control border-0" id="user" required> 
                    </div> 
                    <div class="mb-3 col-12 position-relative"> 
                        <button type="button" id="passwordButton" class="btn text-secondary position-absolute top-50 translate-middle-y end-0 me-2 p-0"><i class="bi bi-eye"></i></button>
                        <input type="password" placeholder="Jelszó" aria-described-by="passwordButton" class="form-control border-0" id="jelszo" required>
                    </div>
                    <div class="form-check mb-2">
                        <input type="checkbox" class="form-check-input mb-3" id="rememberMe">
                        <label for="rememberMe" class="form-check-label mb-2">Emlékezz rám</label>
                    </div>
                    <p class="me-0 text-end"><a class="link link-secondary" data-bind="passReset">Elfelejtett jelszó</a><p>
                    
                    <button type="button" id="bejelentkezes" class="btn btn-warning border-0 w-100">Bejelentkezés</button>`    
    return content
}

function registerFormTemplate(){
    const content = `<h3 class="text-center mb-4" >Regisztráció</h3>
                    <input type="text" placeholder="Felhasználónév" maxlength="320" class="form-control mb-2" id="username" required>     
                
                    <div class="mb-2 position-relative">  
                        <input type="password" placeholder="Jelszó" class="form-control" id="password" required>  
                        <button type="button" class="btn text-secondary position-absolute top-50 translate-middle-y end-0 me-2 p-0"><i class="bi bi-eye"></i></button>
                    </div>  
                    <div class="mb-3 position-relative">  
                        <input type="password" placeholder="Jelszó újra" class="form-control" id="passwordAgain" required>  
                        <button type="button" class="btn text-secondary position-absolute top-50 translate-middle-y end-0 me-2 p-0""><i class="bi bi-eye"></i></button>
                    </div>
                    <div class="form-check mb-2">
                        <input type="checkbox"  class="form-check-input mb-3" id="rememberMe">
                        <label for="rememberMe" class="form-check-label mb-2">Emlékezz rám</label>
                    </div>  
                    <button type="button" class="btn btn-primary w-100">Tovább</button><br>
                    <a class="link link-secondary">Vissza</a>`    
    return content
}

function elfelejtettJelszoFormTemplate(){
    const content = `<h3 class="text-center mb-4">Elfelejtett jelszó</h3>
                    <input type="text" class="form-control mb-3" id="email" placeholder="Emailcím" required>
                    <button type="button" class="btn btn-primary w-100">Jelszó visszaállító link küldése</button>
                    <p class="text-center text-secondary mt-3">
                        Van fiókja?
                        <a href="#" class="link-secondary">Jelentkezzen be</a>
                    </p>`
    return content
}

function accordionItemTemplate(){
    const div = document.createElement('div')
    div.classList.add("accordion-item")
    div.innerHTML = `<h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" aria-expanded="false">
                        
                        </button>
                    </h2>

                    <div class="accordion-collapse collapse" data-bs-parent="#regKerdesek">
                    
                    </div>`
    return div
}

function accordionNincsKepTemplate(){    
    const div = document.createElement('div')
    div.classList.add("p-4", "text-center", "text-muted", "bg-light")
    div.innerHTML = `<div class="mb-2"><i class="bi bi-image"></i></div>
                     <div>Képernyőkép hamarosan…</div>`
    return div
}

function accordionLepesekTemplate(){
    const div = document.createElement('div')
    div.classList.add("mt-2","p-2")
    div.innerHTML = `<div class="d-flex align-items-center gap-2">
                        <i class="bi bi-check2-circle"></i>
                        <h3 class="h6 m-0">Lépések</h3>
                    </div>
                    <ol class="mt-2 mb-0">
                    
                    </ol>`
    return div
}
  
function carouselItemTemplate(){
    
    const div = document.createElement('div')
    div.classList.add('carousel', 'slide')
    div.setAttribute('data-bs-wrap', 'false')
    div.setAttribute('data-bs-ride', 'carousel')
    div.innerHTML = `<div class="carousel-indicators m-auto"></div>
                    <div class="carousel-inner"></div>

                    <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon"></span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                    <span class="carousel-control-next-icon"></span>w
                    </button>`
    return div
}

function userOptionsDefaultButton(){
    const content = `<button class="btn ms-3" data-bs-dismiss="offcanvas">
                        <i class="bi bi-caret-right-fill fs-5"></i>
                    </button>`
    return content
                
}

function userOptionsDefaultOptions(){
    const content = `<div class="btn btn-light w-100 my-2"><i class="bi bi-gear-fill me-1"></i>Fiók beállítások</div>
                    <div class="btn btn-light w-100 my-2"><i id="themeIndicator" class="bi bi-sun-fill me-1"></i>Téma</div>
                    <div class="btn btn-light w-100 my-2"><i class="bi bi-question-circle me-1"></i>Súgó</div>
                    <div class="btn btn-light w-100 my-2"><i class="bi bi-door-open me-1"></i>Kijelentkezés</div>`
    return content
}
