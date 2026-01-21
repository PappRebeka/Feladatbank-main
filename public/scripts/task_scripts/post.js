/* ------ CONTENT ------
task_scripts/load.js ---------------
    - kozzeteszClick           -RD, PR
    - kozzetevesModalReset     -PR
    - selectedCourse           -RD
    - FeladatKozzetesz         -RD
    - getCourses               -RD
*/ 

function kozzeteszClick(id){   //RD, PR
    /*console.log("asd", ActiveLocation != "Feladataim" && ActiveLocation != "Velem megosztott")

    if(ActiveLocation != "Feladataim" && ActiveLocation != "Velem megosztott"){
        toastMsg("Hiba", "Ezzel a feladattal nem lehet ezt a műveletet végrehajtani", "warning")
        return;
    }*/

    kozzetevesModalReset();
    
    const select = document.createElement('select')
    select.addEventListener('change', () => selectedCourse())
    select.classList.add('slim-select', 'w-100', 'form-select-lg', 'mb-3')
    select.id = 'kurzusSelect'

    document.getElementById("tanulokSelect").replaceChildren()
    
    for (let i = 0; i < kurzusok_nevek.length; i++) {
        let option = document.createElement('option')
        option.value = `${kurzusok_idk[i]}-${id}`
        option.textContent = kurzusok_nevek[i]
        
        select.appendChild(option)
    } 
    document.getElementById("megosztasId").replaceChildren(select);
    selectedCourse()
}

function kozzetevesModalReset(){ //PR
        // clears the date and students inputs
        flatPicker?.setDate(null)
        $("#tanulkoSelect").empty()
    }

async function selectedCourse(){ //RD
    var chosenOne = document.getElementById("kurzusSelect")?.value
    var kurzusId = chosenOne.split("-")[0]
    var tanulok = ajax_post("/getStudentList", 1, { kurzusId: kurzusId })
    var tanulokLista = tanulok.diakok
    
    document.getElementById("tanulokSelect").replaceChildren()
    for (let index = 0; index < tanulokLista.length; index++) {
        tanuloObject.Idk.push(tanulokLista[index].userId)
        tanuloObject.Nevek.push(tanulokLista[index].profile.name.fullName) 

        let option = document.createElement('option')
        option.id = `tanuloOption${index}`
        option.value = tanulokLista[index].userId
        option.textContent = tanulokLista[index].profile.name.fullName
        
        document.getElementById("tanulokSelect").appendChild(option)
    }
}

async function FeladatKozzetesz(){ //RD
    const select = document.getElementById("kurzusSelect");
    const opt = select.options[select.selectedIndex];
    var kurzusId = opt.value.split("-")[0]
    var kurzusNev = opt.text
    var feladatId = opt.value.split("-")[1]
    //var tanuloIdk = $('#tanulokSelect').val()
    
    var dueDate =  DateAndTimePicker.value?.split(" ")[0] || ""
    var dueTime =  DateAndTimePicker.value?.split(" ")[1] || ""
    
    var kurz = ajax_post("/postClassroomFeladat", 1, { kurzusid: kurzusId, feladatid: feladatId, dueDate: dueDate, dueTime: dueTime, tanulok: tanuloIdk })
    var kurzusFeladatId = kurz.courseWorkId

    const result = ajax_post("/saveClassroomFeladatKozzetett", 1, { feladatid: feladatId, kurzusNev: kurzusNev, kurzusId: kurzusId, kurzusFeladatId: kurzusFeladatId })
    
    if (result.success) {
        toastMsg("Feladat közzétéve", `A feladat sikeresen közzétéve a(z) ${kurzusNev} kurzusban`, "success")
    } else {
        toastMsg("Hiba", result.error || "Nem sikerült közzétenni a feladatot", "danger")
    }
}

function getCourses(){ //RD
        var kurzus = ajax_post("/sendClassroomCourses", 1, {})
        if (kurzus) {
            kurzusok_nevek = kurzus.nevek
            kurzusok_idk = kurzus.idk
        }
    }