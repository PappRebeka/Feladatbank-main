/* ------ CONTENT ------
filters.js -------------
    - setSearchFilter           -PR   update global search term and reload
    - resetSearchFilter         -PR   clear search inputs and state
    - applyFilters              -RD   copy temp filters to active and reload
    - toggleDifficultyRadio     -PR   custom radio behaviour for difficulty
    - turnDifficultyRadiosOff   -PR   helper to reset difficulty buttons
    - resetFilters              -PR   clear all filter UI and state
    - setSortDirection          -PR   update sort direction and refresh field
    - getSortField              -PR   read selected sort field
    - autofillSubjectFilter     -PR   populate subject dropdown
    - autofillTeacherFilter     -PR   populate teacher dropdown via AJAX
*/


/** Set the global search filter and refresh list data.
 * @param {string} ker - search string
 */
async function setSearchFilter(ker){//PR
    ActiveFilters.kereso = ker ? ker.toLowerCase() : "" // save the search filter globally
    await loadPageData()          // reload the data with the new filter
}

/** Clear search inputs and remove filter state. */
function resetSearchFilter(){ //PR
    document.getElementById("searchbar_nav").value = ""
    document.getElementById("searchbar_offcanvas").value = ""
    ActiveFilters.kereso = ""
}

/** Copy temporary filter selections into the active filters,
 * reload page data, and show a success toast.
 */
async function applyFilters() { //RD
    ActiveFilters.nehezseg   = TempFilters.nehezseg 
    ActiveFilters.evfolyam   = document.getElementById("evfolyamSzuro").value
    ActiveFilters.tantargy   = TempFilters.tantargy
    ActiveFilters.tanar      = TempFilters.tanar 
    ActiveFilters.kurzus     = TempFilters.kurzus
    
    ActiveFilters.order.field = TempFilters.order.field
    ActiveFilters.order.desc  = TempFilters.order.desc
    await loadPageData()
    toastMsg('Szűrő alkalmazva!', 'A szűrő sikeresen alkalmazva', 'success');
}

/** Emulate a radio-group behaviour for difficulty checkboxes.
 * Applies visual styles according to selection state.
 * @param {HTMLInputElement} chosenOne
 */
function toggleDifficultyRadio(chosenOne){ //PR
    // make the buttons look and act like radio buttons
    let state = chosenOne.checked // get the current state
    let id = chosenOne.id+"Gomb" // get the corresponding button id
    let lastClass = document.getElementById(id).classList[2] //last class (btn-*color* or btn-outline-*color*)
    let color = lastClass.split('-')[lastClass.split('-').length -1] // color of the button
    TempFilters.nehezseg = state ? chosenOne.id : "" // -- likely added by RD, keep track of the selected filter
           
    turnDifficultyRadiosOff() // turn off all the buttons
    
    document.getElementById(id).classList.toggle("btn-outline-"+color, !state)
    document.getElementById(id).classList.toggle(`btn-${color}`, state)
    chosenOne.checked = state   //toggle the one that was clicked
}

/** Helper function to turn off all difficulty buttons, used when resetting filters or changing selection. */
function turnDifficultyRadiosOff(){ //PR
    for (const element of document.querySelector("#nehezsegekSzuresReszen").querySelectorAll('label.btn')) {// go though the buttons and turn them off
        let last = element.classList[2] // get the color using the same method as above
        let c = last.split('-')[last.split('-').length -1]
        let i = element.id.replace("Gomb","") // get the corresponding checkbox id
        
        document.getElementById(i).checked = false
        element.classList.remove("btn-"+c) // turn off mechanically and visually
        element.classList.add("btn-outline-"+c)    
    }
}

/** Clear every filter control and reset both TempFilters
 * and ActiveFilters to their defaults.
 */
function resetFilters(){ //PR
    turnDifficultyRadiosOff()

    // reset the evfolyam and tantargy inputs
    document.getElementById("evfolyamSzuro").value = ""
    document.getElementById("tantargySzuro").value = ""
    document.getElementById("sortValues").selectedIndex = 0


    const buttons = document.querySelectorAll(".sortDirectionButton")
    buttons[0].classList.remove('active')
    buttons[1].classList.add('active')

    document.getElementById("searchbar_nav").value = ''
    document.getElementById("searchbar_offcanvas").value = ''

    // reset all the global filter variables
    for (const it of [TempFilters, ActiveFilters]) {
        Object.assign(it, {
            evfolyam: "",
            tantargy: "",
            nehezseg: "",
            tanar: "",
            kurzus: "",
            kereso: "",
            order: { field: "id", desc: 1 }
        });
    }
}

/** Update temporary sort direction and toggle the UI buttons.
 * @param {0|1} dir
 */
function setSortDirection(dir){ //PR
  TempFilters.order.desc = dir; // 0 asc, 1 desc  https://www.reddit.com/r/ProgrammerHumor/comments/1i3r1zd/fakestatement/
  document.getElementById("sortAsc").classList.toggle("active", dir == 0);
  document.getElementById("sortDesc").classList.toggle("active", dir == 1);
  getSortField();
}

/** Read the selected sort field from dropdown into temp filters. */
function getSortField(){ //PR
  TempFilters.order.field = document.getElementById("sortValues").value; // Nev/Nehezseg/Evfolyam/id  (maybe add sender/corse)
}

/** Populate the subject filter dropdown. Optionally preserve a previously selected value.
 * @param {Object} tantargyak
 * @param {string} selectedTantargy
 */
function autofillSubjectFilter(tantargyak, selectedTantargy){ //PR, RD, selectedTantargy: a szűrő alkalmazása előtti kiválasztott tantárgy, azért van hogy a tantárgy selected maradjon
    document.getElementById('tantargySzuro').innerHTML = `<option value="" class="d-none" hidden></option>`
    for (const id in tantargyak) {
        var t = tantargyak[id].Tantargy
        let opt = document.createElement('option')
        opt.value = t; opt.textContent = t
        opt.selected = selectedTantargy == t 
        document.getElementById('tantargySzuro').appendChild(opt)
    }
}

/** Populate the teacher filter dropdown by fetching teacher data from the server. */
async function autofillTeacherFilter(){ //PR
    const options = await ajax_post("/getTanarForAuto", 1, { vevoId: CurrentUserData.id }, false)
    document.getElementById("tanarSzuro").innerHTML = `<option value="" class="d-none" hidden></option>`
    for (const item of options.results){
        let opt = document.createElement('option')
        opt.value = `id_${item.id}`; opt.textContent = item.Nev
        document.getElementById("tanarSzuro").appendChild(opt) 
    }
}
