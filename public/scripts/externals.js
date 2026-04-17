/* ------ CONTENT ------
externals.js ---------------
  - the same stuff x5               Saving not-yet-applied filters
  - createSlimSelect       -PR, RD  SlimSelect initialization
  - setFlatPicker          -PR      Flatpickr initialization
*/ 

/** Save the filter (subject) in TempFilters.
 * @param {Event} e - The event triggered by the change in the select element.
 */
function tantargyChanged(e){
    TempFilters.tantargy = e[0].value
}

/** Save the filter (teacher) in TempFilters.
 * @param {Event} e - The event triggered by the change in the select element.
 */
function tanarChanged(e){
    TempFilters.tanar = e[0].value.substring(3)
}

/** Save the filter (course) in TempFilters.
 * @param {Event} e - The event triggered by the change in the select element.
 */
function kurzusChanged(e){
    TempFilters.kurzus = e[0].value
}

/** Save the selected institute in the intezmenyId variable.
 * @param {Event} e 
 */
function IntezmenyChanged(e){
    intezmenyId = e[0].value
}

/** Save the selected students' IDs in the tanuloIdk array.
 * @param {Event} e 
 */
function tanulokChanged(e){
    tanuloIdk = []
    for (const item of e) {
        tanuloIdk.push(item.value)
    }
}

/**
 * Initialize a SlimSelect dropdown with specific settings and event handlers.
 * @param {string} hovaId - The ID of the select element to initialize as a SlimSelect dropdown.
 * @param {Function} functionNev - The function to be called after a change in the dropdown.
 */
function createSlimSelect(hovaId, functionNev){ //PR, RD
    //document.getElementById(hovaId)?.selectedIndex = -1
    var ss = new SlimSelect({
            select: document.getElementById(hovaId),
            cssClasses: {
                option: "option"
            },
            settings: {
                closeOnSelect: false,
                allowDeselect: true,
                focusSearch: true,
                searchPlaceholder: 'Keresés…',
                //contentPosition: 'fixed',
                currentLocation: document.querySelector("#local"),
                contentLocation: document.querySelector(hovaId == "tantargySzuro" ? "#szuro .dropdown-menu" :
                                                        hovaId == "tanarSzuro"    ? "#szuro .dropdown-menu" : "body")
            },
            events: {
                afterChange: (e) => {
                    functionNev(e)
                },
                searchFilter: (option, search) => {
                    if(search.length < 2)
                        return option.text.toLowerCase().substring(0, search.length) == search
                    else{
                        return option.text.toLowerCase().includes(search.toLowerCase())
                    }
                }
            }
        })
    //ss.setSelected(null);
    ss.selectedIndex = -1
}

/** Initialize a Flatpickr date-time picker with specific settings.
 * @param {string} id 
 */
function setFlatPicker(id){ //PR
    flatPicker = $(`#${id}`).flatpickr({
        minDate: "today",
        altInput: true,
        enableTime: true,
        time_24hr: true,
        altFormat: "Y. F j, H:i",
        dateFormat: "Y-m-d H:i",
        disableMobile: true,
        static: true
    });
}