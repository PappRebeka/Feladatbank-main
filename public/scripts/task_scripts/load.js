/* ------ CONTENT ------
task_scripts/load.js ---------------
    - feladatCardClick             -PR
    - buildTaskCard                -PR
    - setTaskModalContent          -PR, RD
    - getCorrespondingFileIcon     -BBB
*/ 



async function feladatCardClick(dataId){ //PR
    const id = Number(dataId);
    const asdf = taskById.get(id);

    const adat = JSON.parse(decodeURIComponent(asdf.adat));
    const felhasznalo = asdf.Felhasznalo;

    await setTaskModalContent(adat, felhasznalo);
}

function buildTaskCardPrimaryData(adat, felhasznalo, felhasznaloColor, kurzusnev){

    const container = taskCardTemplate();
    container.id = `task-${adat.id}`;

    if(Boolean(adat?.Csillagozva)){
        $bind(container, 'bookmarkTaskButton').classList.add('text-warning', 'bi-star-fill')
        $bind(container, 'bookmarkTaskButton').classList.remove('bi-star')
    }
    
    const card = $bind(container, 'card');

    //card.dataset.adat = encodeURIComponent(JSON.stringify(adat));
    card.dataset.id = String(adat.id);
    card.dataset.felhasznalo = felhasznalo ?? '';
    card.style.border = `4px solid ${borderColor(adat.Nehezseg)}`;
    const ezEgyId = adat.id
    const cardClick = async (e) => { feladatCardClick(ezEgyId); };
    card.onclick = cardClick;

    const nevText = adat.Nev
    highlightSearchedText(ActiveFilters.kereso, nevText, $bind(container, 'nev'))

    $bind(container, 'tantargy').textContent = adat.Tantargy;
    $bind(container, 'tema')    .textContent = adat.Tema;
    $bind(container, 'evfolyam').textContent = `${adat.Evfolyam}.`;
    $bind(container, 'nehezseg').textContent = `${adat.Nehezseg}/10`;
    $bind(container, 'leiras')  .textContent = adat.Leiras;

    const db = Number(adat.alfDb) || 0;
    $bind(container, 'alfDb').textContent = db > 0 ? `${db} alfeladat` : 'Nincs alfeladat';

    //Sender block
    showElement(container, 'felhasznaloRow', Boolean(felhasznalo));
    if (felhasznalo){
        $bind(container, 'felhasznaloName').textContent = felhasznalo;
        setBgColor(container, 'felhasznaloCircle', felhasznaloColor);

        console.log('felhasznaloColor', felhasznaloColor)

        const icon = document.createElement('span');
        icon.className = `text-${isBackgroundDark(felhasznaloColor) ? "light" : "dark"}-important`;
        icon.style.fontSize = '0.75rem';
        icon.style.lineHeight = '1';
        icon.textContent = felhasznalo[0]?.toUpperCase() ?? '';

        $bind(container, 'felhasznaloCircle').appendChild(icon);
    }

    //Course block
    showElement(container, 'kurzusRow', Boolean(kurzusnev));
    if (kurzusnev) $bind(container, 'kurzusName').textContent = kurzusnev;
    
    //Button 
    const which = ActiveLocation == "Archívum" ? '' : 
                  ActiveLocation == "Általam megosztott" ? 'visszaBtn' : 'postBtn'
    //showElement(container, 'bookmarkTaskButton', Boolean(which));


    var p = $bind(container, 'postBtn')
    var v = $bind(container, 'visszaBtn')
    var b = $bind(container, 'bookmarkTaskButton')
    
    p.classList.toggle('d-none', which != 'postBtn')
    v.classList.toggle('d-none', which != 'visszaBtn')
    b.classList.toggle('d-none', (ActiveLocation == "Archívum" || ActiveLocation == 'Általam megosztott') )

    
    const kozzeteves = async (e) => { e.stopPropagation(); await kozzeteszButtonClick(ezEgyId) }
    p.onclick = kozzeteves;

    const megosztTorol = async (e) => { e.stopPropagation(); await removeSharedTask(ezEgyId, felhasznalo); }
    v.onclick = megosztTorol;

    const konyvJelzo = async (e) => { e.stopPropagation(); await bookmarkTaskClick(ezEgyId, b); }
    b.onclick = konyvJelzo;

    taskById.set(adat.id, adat); // i don't know

    return container
}

function buildTaskCard(adat, felhasznalo, felhasznaloColor, kurzusnev){//PR
    const container = buildTaskCardPrimaryData(adat, felhasznalo, felhasznaloColor, kurzusnev)
    return container;
}

async function setTaskModalContent(adat, felhasznalo){ //PR, RD
    feladatAdatai = adat
    var counter = 1;
    var alfeladatok = await ajax_post("/SendAlFeladatok", 1, { feladatId: adat.id }, true)
    CancelEditingThisFeladat(false, felhasznalo, `task-${adat.id}`);

    const modal = document.getElementById("modalFeladatContent")
    modal.innerHTML = taskModalTemplate(); // safe because its pure
    $bind(modal, "tantargy").textContent = adat.Tantargy;
    $bind(modal, "tema")    .textContent = adat.Tema;
    $bind(modal, "leiras")  .textContent = adat.Leiras;
    $bind(modal, "nehezseg").textContent = adat.Nehezseg;
    $bind(modal, "evfolyam").textContent = adat.Evfolyam + ".";
    
    if(!alfeladatok.results) {
        $bind(modal, "alfeladatokList").innerHTML = "<p class='nincsen m-auto text-center p-2'>Nincsenek alfeladatok ehhez a feladathoz</p>"
    }
    else{
        for (const a of alfeladatok.results) {
            var leiras = a.Leiras
            var fajl = a.FajlInfo ? a.FajlInfo : null
            var pont = a.Pont

            const alfeladatDiv = taskModal_AlfeladatTemplate();
            alfeladatDiv/*.firstChild*/.id = `ThisIsAlfeladat${a.id}`;

            $bind(alfeladatDiv, "alfeladatPont").textContent = pont;
            $bind(alfeladatDiv, "alfeladatLeiras").textContent = leiras;

            const fajlContainer = $bind(alfeladatDiv, "alfeladatFajl");
            fajlContainer.classList.toggle('d-none', !Boolean(fajl))
            if (fajl){ 
                fajlContainer.children[0].dataset.fileId = fajl["identifier"]

                $bind(alfeladatDiv, 'fajlIkon').innerHTML = getCorrespondingFileIcon(fajl)
                $bind(alfeladatDiv, "fajlNev").textContent = fajl["nev"];
                $bind(alfeladatDiv, "fajlMeret").textContent = formatFileSize(fajl["meret"])

                const link = String(fajl["link"] ?? "");
                const aElement = $bind(alfeladatDiv, "fajlLetoltes").querySelector("a");

                if (link.startsWith("/letolt-fajl/") && aElement) aElement.setAttribute("href", link);
                else aElement.removeAttribute("href");

            }
            counter += 1
            $bind(modal, "alfeladatokList").appendChild(alfeladatDiv)
        }
    }
}

function getCorrespondingFileIcon(fajl) { // BBB
    ext = fajl["nev"].split('.').pop().toLowerCase();

    const iconMap = {
        pdf: '<i class="bi bi-file-earmark-pdf"></i>',
        docx: '<i class="bi bi-filetype-docx"></i>',
        doc: '<i class="bi bi-filetype-doc"></i>',
        xlsx: '<i class="bi bi-filetype-xlsx"></i>',
        xls: '<i class="bi bi-filetype-xls"></i>',
        pptx: '<i class="bi bi-filetype-pptx"></i>',
        ppt: '<i class="bi bi-filetype-ppt"></i>',
        txt: '<i class="bi bi-filetype-txt"></i>',
        csv: '<i class="bi bi-filetype-csv"></i>',
        jpg: '<i class="bi bi-image"></i>',
        jpeg: '<i class="bi bi-image"></i>',
        png: '<i class="bi bi-image"></i>',
        gif: '<i class="bi bi-filetype-gif"></i>',
        svg: '<i class="bi bi-filetype-svg"></i>',
        mp3: '<i class="bi bi-music-note"></i>',
        m4a: '<i class="bi bi-music-note"></i>',
        wav: '<i class="bi bi-music-note"></i>',
        mp4: '<i class="bi bi-file-play"></i>',
        mov: '<i class="bi bi-file-play"></i>',
        py: '<i class="bi bi-filetype-py"></i>',
        js: '<i class="bi bi-javascript"></i>',
        cpp: '<i class="bi bi-file-binary"></i>',
        java: '<i class="bi bi-filetype-java"></i>',
        zip: '<i class="bi bi-file-earmark-zip"></i>',
        rar: '<i class="bi bi-file-earmark-zip"></i>',
        tar: '<i class="bi bi-file-earmark-zip"></i>',
        exe: '<i class="bi bi-filetype-exe"></i>'
    }        

    return iconMap[ext] || '<i class="bi bi-file"></i>';
}