/* ------ CONTENT ------
externals.js ---------------
  - the same stuff x5   
  - createSlimSelect       -PR, RD
  - setFlatPicker          -PR
*/ 


function tantargyChanged(e){
    TempFilters.tantargy = e[0].value
}

function tanarChanged(e){
    TempFilters.tanar = e[0].value.substring(3)
}

function kurzusChanged(e){
    TempFilters.kurzus = e[0].value
}

function IntezmenyChanged(e){
    intezmenyId = e[0].value
}

function tanulokChanged(e){
    tanuloIdk = []
    for (const item of e) {
        tanuloIdk.push(item.value)
    }
}

function createSlimSelect(hovaId, functionNev){ //PR, RD
  const selectEl = document.getElementById(hovaId);

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
                contentPosition: 'fixed',
                currentLocation: selectEl,
                contentLocation: document.body
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

document.addEventListener("mousedown", (e) => {
  if (e.target.closest(".ss-content, .ss-main")) {
    e.stopPropagation();
  }
}, true);

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