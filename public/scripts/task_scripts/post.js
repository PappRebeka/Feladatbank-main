/* ------ CONTENT ------
task_scripts/load.js ---------------
    - kozzeteszButtonClick        -RD, PR
    - resetKozzetevesModal        -PR
    - loadAvailableCourses        -RD
    - postTaskToClassroom         -RD
    - getCoursesFromClassroomAPI  -RD
*/ 

async function kozzeteszButtonClick(id){   //RD, PR
    await getCoursesFromClassroomAPI();
    resetKozzetevesModal();
    
    const select = document.createElement('select')
    select.addEventListener('change', async () => await loadAvailableCourses())
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
    await loadAvailableCourses()
}

function resetKozzetevesModal(){ //PR
        // clears the date and students inputs
        flatPicker?.setDate(null)
        $("#tanulkoSelect").empty()
}

async function loadAvailableCourses(){ //RD
    var chosenOne = document.getElementById("kurzusSelect")?.value
    var kurzusId = chosenOne.split("-")[0]
    var tanulok = await ajax_post("/getStudentList", 1, { kurzusId: kurzusId }, false)
    var tanulokLista = Array.from(tanulok?.diakok || []) || []
    
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

function postJSON(url, data) {
  return $.ajax({
    url: url,
    method: "POST",
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data)
  });
}

async function postTaskToClassroom() {
  const pb = new ContinuousProgressBar();
  pb.start();

  try {
    const feladatModal = $("#shareFeladat");
    const select = $("#kurzusSelect")[0];
    const modeSelect = feladatModal.find("#modeSelect");

    const opt = select.options[select.selectedIndex];
    const [kurzusId, feladatId] = opt.value.split("-");
    const kurzusNev = opt.text;
    const shareMode = modeSelect.val();

    const [dueDate = "", dueTime = ""] =
      DateAndTimePicker.value?.split(" ") ?? [];

    const kurz = await postJSON("/postClassroomFeladat", {
      kurzusid: kurzusId,
      feladatid: feladatId,
      dueDate,
      dueTime,
      tanulok: tanuloIdk,
      shareMode
    });

    const kurzusFeladatId = kurz.courseWorkId;

    const result = await postJSON("/saveClassroomFeladatKozzetett", {
      feladatid: feladatId,
      kurzusNev,
      kurzusId,
      kurzusFeladatId
    });

    if (!result.ok) {
      throw new Error(result.error || "Nem sikerült közzétenni a feladatot");
    }

    toastMsg(
      "Feladat közzétéve",
      `A feladat sikeresen közzétéve a(z) ${kurzusNev} kurzusban`,
      "success"
    );
  } catch (err) {
    console.error(err);
    toastMsg(
      "Hiba",
      err.responseJSON?.error || err.message || "Ismeretlen hiba",
      "danger"
    );
  } finally {
    pb.remove();
  }
}

async function getCoursesFromClassroomAPI(){ //RD
        var kurzus = await ajax_post("/sendClassroomCourses", 1, {}, false)
        if (kurzus) {
            kurzusok_nevek = kurzus.nevek
            kurzusok_idk = kurzus.idk
        }
    }