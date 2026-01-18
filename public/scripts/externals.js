/* ------ CONTENT ------
externals.js ---------------
  - the same stuff x4
  - valtozottTanulokSelect  -RD?   
  - CreateSlimSelect2       -PR, RD
  - flatpickerSet           -PR
*/ 


function tantargyChanged(e){
    TempFilters.tantargy = e[0].value
}

function tanarChanged(e){ //PR
    TempFilters.tanar = e[0].value.substring(3)
}

function kurzusChanged(e){
    TempFilters.kurzus = e[0].value
}

function IntezmenyChanged(e){
    intezmenyId = e[0].value
}

function valtozottTanulokSelect(e){//RD?
    tanuloIdk = []
    for (const item of e) {
        tanuloIdk.push(item.value)
    }
}

function CreateSlimSelect2(hovaId, functionNev){ //PR, RD
        document.getElementById(hovaId).selectedIndex = -1
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
                    currentLocation: document.getElementById("local")
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
        ss.setSelected(null);
        ss.selectedIndex = -1
}

function flatpickerSet(id){ //PR
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