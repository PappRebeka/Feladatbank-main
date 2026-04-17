/* ------ CONTENT ------
task_scripts/post.js ---------------
    - kozzeteszButtonClick        -RD, PR   handle share-modal setup
    - resetKozzetevesModal        -PR       clear modal inputs
    - loadAvailableCourses        -RD       populate student list
    - postJSON                    -??       helper for AJAX POSTing JSON
    - postTaskToClassroom         -RD       send task to Classroom & save
    - getCoursesFromClassroomAPI  -RD       fetch course list from API
*/ 

/** Initialize and display the "share task" modal.
 * Loads available Classroom courses then builds a <select>
 * with options tied to the provided task id. Selecting a course
 * triggers loading of its student list.
 * @param {number|string} id - task identifier to share
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

/** Reset fields in the share modal before showing it again.
 * Clears the date picker and empties the student selection.
 */
function resetKozzetevesModal(){ //PR
        // clears the date and students inputs
        flatPicker?.setDate(null)
        $("#tanulkoSelect").empty()
}

/** After a course is selected, fetch its student roster from
 * the server and populate the multi-select field.
 * Also saves data into global tanuloObject arrays.
 */
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

/** Simple wrapper for jQuery AJAX POSTing JSON data.
 * @param {string} url - endpoint
 * @param {Object} data - payload to send
 */
function postJSON(url, data) {
  return $.ajax({
    url: url,
    method: "POST",
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data)
  });
}

/**  Perform the actual sharing operation:
 * 1. validate inputs
 * 2. call server endpoints to post to Google Classroom
 * 3. record the shared task in local database
 * Shows progress bar and handles success/failure toasts.
 */
async function postTaskToClassroom() {
  if(document.getElementById('modeSelect').value == '') {
    toastMsg( "Kitöltetlen mező.", 'Válasszon fájl megosztási módot', "warning" );
    return;
  }
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

/** Fetch the list of courses from the server and populate global arrays with their names and IDs. */
async function getCoursesFromClassroomAPI(){ //RD
        var kurzus = await ajax_post("/sendClassroomCourses", 1, {}, false)
        if (kurzus) {
            kurzusok_nevek = kurzus.nevek
            kurzusok_idk = kurzus.idk
        }
    }