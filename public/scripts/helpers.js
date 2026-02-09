
/* ------ CONTENT ------
helpers.js -------------
  - await ajax_get 
  - await ajax_post
  - checkDarkMode           -PR
  - setThemeIndicators      -PR
  - validateField           -BBB
  - checkWindowSize         -BBB
  - isBackgroundDark        -PR
  - LogSession              -PR
  - borderColor             -PR, BBB
  - getField                -PR
  - showErrorMsg            -BBB
  - toastMsg                -PR
  - hslSzinGeneral          -RD
  - tulKozel                -RD
  - rnd                     -PR
  - randomHatterszin        -PR
  - checkNumber             -PR
  - formatFileSize          -BBB
  - checkFileSize           -BBB, PR
  - $bind                   -PR
  - showElement             -PR
  - setBgColor              -PR
  - preventParentClick      -PR
  - highlightSearchedText   -PR
  - escapeRegex             -PR
*/

function ajax_get(urlsor, hova, tipus, mutassTolt = true) {
    document.documentElement.style.cursor = "wait";
    if (mutassTolt) showLoadingModal();

    return $.ajax({
        url: urlsor,
        type: "get",
        cache: false,
        dataType: tipus === 0 ? 'html' : 'json'
    }).done(function(data) {
        if (hova) $(hova).html(data);
    }).always(function() {
        document.documentElement.style.cursor = "default";
        if (mutassTolt) hideLoadingModal();
    });
}

function ajax_post(urlsor, tipus, data, mutassTolt = true) {
    document.documentElement.style.cursor = "wait";
    if (mutassTolt) showLoadingModal();

    return $.ajax({
        url: urlsor,
        type: "post",
        cache: false,
        dataType: tipus === 0 ? 'html' : 'json',
        contentType: data ? 'application/json' : undefined,
        data: data ? JSON.stringify(data) : undefined,
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('error')
            console.log(jqXHR)
            console.log(textStatus)
            console.log(errorThrown)
        },
    }).always(function() {
        document.documentElement.style.cursor = "default";
        if (mutassTolt) hideLoadingModal();
    });
}

/*function await ajax_get( urlsor, hova, tipus, aszinkron ) { //KA // html oldalak beszúrására használjuk
    document.documentElement.style.cursor = "wait";
    $.ajax({url: urlsor, type:"get", async:aszinkron, cache:false, dataType:tipus===0?'html':'json',
        beforeSend:function(xhr) { },
        success: function(data) { $(hova).html(data); },
        error: function(jqXHR, textStatus, errorThrown) {
        },
        complete: function() { 

            document.documentElement.style.cursor="default";    
        }
    });
    return true;
};

function await ajax_post( urlsor, tipus, data, aszinkron = false ) { //KA // json restapi-hoz használjuk
    document.documentElement.style.cursor = "wait";
    var s = "";
    var ajaxConfig = {url: urlsor, type: "post", async: aszinkron, cache: false, dataType: tipus===0?'html':'json',
        beforeSend: function(xhr) { },
        success: function(response) { s = response; },
        error: function(jqXHR, textStatus, errorThrown) {
        },
        complete: function() { 
            document.documentElement.style.cursor="default";
        }
    };
    
    if (data) {
        ajaxConfig.contentType = 'application/json';
        ajaxConfig.data = JSON.stringify(data);
    }
    
    $.ajax(ajaxConfig);
    return s;
};*/

function showLoadingModal(message = "Töltés...") {;
    $("#loadingMessage").text(message);
    $("#loadingDiv").removeClass("d-none");
}

function hideLoadingModal() {
    $("#loadingDiv").addClass("d-none");
    $("#loadingMessage").text("");
}

function checkDarkMode(){//PR
    var isDark = getCookie("darkMode") == "1" || false;

    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)
    setCookie('darkMode', isDark ? '1' : '0', date)

    htmlElement.classList.toggle('darkMode', isDark);
    setThemeIndicators(isDark)
}

function setThemeIndicators(isDark){//PR
  try{
        document.getElementById("themeIndicator").classList.toggle("bi-sun-fill", !isDark); 
        document.getElementById("themeIndicator").classList.toggle("bi-moon-fill", isDark);
    }
    catch{}
}

function validateField() { // BBB
    jo = true
    reasonok = []

    // pattern arra hogy van e spec karakter: "'\";˛\\/*+%&()=?<>[]"
    const pattern = /['";˛\\/*+%&()=?<>\[\]]/; 
    $("#feladat").find("input[type='text']").each(function() {
        const text = $(this).val();
        const id   = $(this).attr("id");
        
        if (text.length === 0) {
            jo = false;
            reasonok.push(`A(z) ${id} mező hossza nem lehet nulla.`);
        }
        if (pattern.test(text)) {
            jo = false;
            reasonok.push(`A(z) ${id} mező nem tartalmazhatja a következő karaktereket: '\";˛\\/*+%&()=?<>[]`);
        }
    })
    return [jo, reasonok];
}

function checkWindowSize() {//BBB
    let vw = window.innerWidth;
    let vh = window.innerHeight;

    if ((vw < 300) || (vh < 300)) {
        $("#tooSmall").removeClass("d-none");
    } else {
        $("#tooSmall").addClass("d-none");
    }
}

function isBackgroundDark(rgb) {//PR
    // determine if a background color is dark or light. found it on the internet

    // Uses the ITU-R BT.601 luminance formula to estimate perceived brightness
    console.log(rgb)
    try{
        const [r, g, b] = rgb.substring(4, rgb.length - 1).split(" ").map(Number);
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        return brightness < 128;
    } catch{ return false; }
    
    
    // Source: standard perceptual luminance formula (0.299R + 0.587G + 0.114B)
    // Commonly used in accessibility and theming utilities

}

function borderColor(nehezseg){ //PR, BBB
    //easy visualization of difficulty levels
    const szinek = [
        "rgb(0,255,0)",
        "rgb(57,232,0)",
        "rgb(113,208,0)",
        "rgb(170,185,0)",
        "rgb(227,162,0)",
        "rgb(253,133,0)",
        "rgb(249,100,0)",
        "rgb(245,67,0)",
        "rgb(241,33,0)",
        "rgb(237,0,0)"
    ]//green orange and red, expanded into gradient by BBB

    return szinek[nehezseg - 1];
}

function getField(idBase, hol) {//PR
    //get the value of an input field, compicated by some call/id name shenanigans
    var edit = idBase.includes("-s") ? idBase.substring(0, idBase.length -2) : idBase; //task creation has slim (-s sufix) version, but we just need the base
    return hol.includes("alfeladatBox") ? $(`#${idBase}`).val().toString() : $(`#${edit}Edit`).val().toString(); //return the value of the correct field
}                                               //creation                      //editing

function showErrorMsg(msg) {//BBB
    $("#errorMsg").css("opacity", 1.0);
    $("#errorMsg").html(msg)

    $("#errorMsg").show()

    setTimeout(() => {
        $("#errorMsg").css("opacity", 0.0);
    }, 3000);
}

function toastMsg(title, msg, type) {//PR
    //toast message for user feedback, its pretty self explanatory
    let piritos = document.getElementById("toast")
    
    piritos.querySelector('#toast-tile').textContent = title;
    piritos.querySelector('.toast-body').textContent = msg;

        //type = success, danger, warning, info (bootstrap colors)
    let color = `bg-${type}`;
    piritos.querySelector(".toast-header").classList.remove(piritos.querySelector(".toast-header").classList[1]);
    piritos.querySelector(".toast-header").classList.add(color);    //remove the old color and add the new one

    piritos.classList.add("show");
    setTimeout(() => { //show it for 5 seconds
        piritos.classList.remove("show");
    }, 5000);
}

function rnd(min, max) {//PR
    //random number between min and max inclusive
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

function randomHatterszin(){ //PR
    //random rgb value
    return `rgb(${rnd(0, 255)} ${rnd(0, 255)} ${rnd(0, 255)})`;
}

function checkNumber(input, max){  //PR
    input.value = input.value.replace(/\D/g,'')         //regex meaning all non-digit characters  (d -> digit, D -> !digit)
    if(Number(max) && parseInt(input.value) > max) input.value = max     //max
    else if(parseInt(input.value) < 1)             input.value = '' //clear       
}

function formatFileSize(bytes) { // BBB
    if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 B';
    const negative = bytes < 0;
    let value = Math.abs(Number(bytes));

    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }

    // choose precision: no decimals for large numbers, more for small
    const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    let str = value.toFixed(precision);
    // strip trailing zeros and possible trailing dot
    str = str.replace(/(\.\d*?[1-9])0+$|\.0+$/,'$1');

    return (negative ? '-' : '') + str + ' ' + units[i];
}

function checkFileSize(fileInput, fakeFileName = null){//BBB, PR
    const file = fileInput.files[0];

    if (file && file.size > max_fajl_meret) { // dont let the user upload too large files
        toastMsg('Túl nagy a fájl', `A fájl mérete nem haladhatja meg a ${formatFileSize(max_fajl_meret)}-t.`, 'warning');
        fileInput.value = ''; //clear value and fake value
        if (fakeFileName) document.getElementById(fakeFileName).textContent = "Nincs fájl kiválsztva";
    }
}


//--- DOM tools ---//

const $bind = (container, key) => 
    container.querySelector(`[data-bind="${key}"]`);


function showElement(container, key, show) {
    const element = $bind(container, key);
    if (element) {
        element.classList.toggle('d-none', !show);
    }
}

function setBgColor(container, key, rgb) {
    const element = $bind(container, key);
    if (element) {
        element.style.backgroundColor = rgb;
    }
}

function preventParentClick(btn){
    btn.addEventListener('click', function(e){
        e.stopPropagation();
    })
}

function highlightSearchedText(keres, text, textHely){
    if(keres) {
        const regex = new RegExp(`(${escapeRegex(keres)})`, 'gi')

        let lastIndex = 0;
        for (const match of text.matchAll(regex)) {
            const start = match.index;
            const end = start + match[0].length;

            // normal text before match
            if (start > lastIndex) {
                textHely.appendChild(document.createTextNode(text.slice(lastIndex, start)));
            }

            // highlighted part
            const mark = document.createElement("mark");
            mark.textContent = text.slice(start, end);
            textHely.appendChild(mark);

            lastIndex = end;
        }

        // remaining text after last match
        if (lastIndex < text.length) {
            textHely.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
      }
    else textHely.textContent = text
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
