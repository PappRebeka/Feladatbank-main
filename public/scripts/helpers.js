
/* ------ CONTENT ------
helpers.js -------------
  - ajax_get               - KA            generic AJAX GET wrapper
  - ajax_post              - KA, PR, BBB   generic AJAX POST wrapper
  - registerWebsocket      - BBB           setup authenticated websocket
  - showLoadingModal       - BBB           display global loading overlay
  - hideLoadingModal       - BBB           hide loading overlay
  - checkDarkMode          - PR            manage dark mode cookie/theme
  - setThemeIndicators     - PR            toggle theme icons
  - validateField          - BBB           sanitize text inputs
  - checkWindowSize        - BBB           warn if viewport too small
  - isBackgroundDark       - PR            color luminance check
  - borderColor            - PR, BBB       difficulty gradient
  - getField               - PR            abstract task field retrieval
  - showErrorMsg           - BBB           show transient error message
  - toastMsg               - PR            bootstrap-style toast popup
  - rnd                    - PR            random integer in range
  - randomHatterszin       - PR            random rgb string
  - checkNumber            - PR            enforce numeric input bounds
  - formatFileSize         - BBB           human-readable bytes
  - checkFileSize          - BBB, PR       validate file input size
  - $bind                  - PR            query selector helper
  - showElement            - PR            toggle element visibility
  - setBgColor             - PR            set background color by key
  - preventParentClick     - PR            stop event propagation
  - highlightSearchedText  - PR            wrap matched substrings in <mark>
  - escapeRegex            - PR            escape string for regex use
*/

/** Simplified wrapper around jQuery.ajax for GET requests.
 * Inserts returned HTML when a target selector is provided.
 * @param {string} urlsor      - request URL
 * @param {string|null} hova   - jQuery selector for injecting result
 * @param {number} tipus       - 0=html, else json
 * @param {boolean} mutassTolt - whether to display loading modal
 */
function ajax_get(urlsor, hova, tipus, mutassTolt = true) {
    document.documentElement.style.cursor = "wait";
    if (mutassTolt) { showLoadingModal(); }

    return $.ajax({
        url: urlsor,
        type: "get",
        cache: false,
        dataType: tipus === 0 ? 'html' : 'json'
    }).done(function(data) {
        if (hova) $(hova).html(data);
    }).always(function() {
        document.documentElement.style.cursor = "default";
        if (mutassTolt) { hideLoadingModal(); }
    });
}

/** Simplified wrapper around jQuery.ajax for POST requests. Sends JSON body if provided,
 * swallows errors by logging them, and restores cursor on completion.
 * @param {string} urlsor
 * @param {number} tipus
 * @param {Object|null} data
 * @param {boolean} mutassTolt
 */
function ajax_post(urlsor, tipus, data, mutassTolt = true) {
    document.documentElement.style.cursor = "wait";
    //if (mutassTolt) showLoadingModal();

    return $.ajax({
        url: urlsor,
        type: "post",
        cache: false,
        dataType: tipus === 0 ? 'html' : 'json',
        contentType: data ? 'application/json' : undefined,
        data: data ? JSON.stringify(data) : undefined,
        processData: false,
        error: function(jqXHR, textStatus, errorThrown) {
            console.log('error in '+urlsor)
            console.log(jqXHR)
            console.log(textStatus)
            console.log(errorThrown)
            //return "";
        },
    }).always(function() {
        document.documentElement.style.cursor = "default";
        //if (mutassTolt) hideLoadingModal();
    });
}


/** Establish a WebSocket connection with authentication and
 * automated heartbeat/reconnect logic. Handles server commands
 * for logout and user deletion.
 * @param {string} url - websocket endpoint
 */
function registerWebsocket(url) {
    let webSocket = new WebSocket(url);
    let userToken = sessionStorage.getItem("userToken")
    if (!userToken) {
        console.error("Missing userToken");
    }
    let heartbeatInterval;
    let reconnectAttempts = 0;

    webSocket.onopen = (event) => {
        webSocket.send(JSON.stringify({
            "event": "authentication",
            "userToken": userToken
        }))
    };

    webSocket.onmessage = (event) => {
        let jsonData = event.data;
        //console.log(`jsonData: ${jsonData}`)
        if (jsonData == 'authenticationOk'){
            console.log(`websocket: authentication OK`);

            canLogIn = true;

            let heartbeatFunction = () => {
                if(webSocket.readyState === webSocket.OPEN) {
                    webSocket.send(JSON.stringify({
                        "event": "heartbeat",
                        "userToken": userToken
                    }));
                }
            }; heartbeatFunction();

            heartbeatInterval = setInterval(heartbeatFunction, 2000)
        } else if (jsonData == 'authenticationBad') {
            window.location.href = 'hiba.html?code=4'
        } 
         if (jsonData == 'userDelete') {
            window.location.href = 'hiba.html?code=5'
            killCookie('stayLoggedIn') 
        }
    };

    webSocket.onclose = (event) => {
        console.log(`websocket: code=${event.code}; reason=${event.reason};`);
        if(heartbeatInterval) clearInterval(heartbeatInterval);     

        if(reconnectAttempts < 10) {
            console.log(`websocket: reconnecting in 4s (attempt ${reconnectAttempts})`);
            setTimeout(() => registerWebsocket(url), 4000)

            reconnectAttempts++;
        } else {
            window.location.href = `hiba.html?code=0`;
        }

        
    };

    webSocket.onerror = (error) => {
        console.log(`websocket: error ${error}`);
        webSocket.close()
    };
}


    /** Reveal an overlay with optional custom message.
     * @param {string} message (optionalp)
     */
    function showLoadingModal(message = "Töltés...") {;
        $("#loadingMessage").text(message);
        $("#loadingDiv").removeClass("d-none");
    }

    /** Hide the global loading overlay. */
    function hideLoadingModal() {
        $("#loadingDiv").addClass("d-none");
        $("#loadingMessage").text("");
    }


/** Check the initial state of dark mode based on cookie, apply theme, and update indicators. */
function checkDarkMode(){//PR
    var isDark = getCookie("darkMode") == "1" || false;

    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)
    setCookie('darkMode', isDark ? '1' : '0', date)

    htmlElement.classList.toggle('darkMode', isDark);
    setThemeIndicators(isDark)
}

/** Update theme indicator UI based on dark mode state.
 * @param {bool} isDark
 */
function setThemeIndicators(isDark){//PR
  try{
        document.getElementById("themeIndicator").classList.toggle("bi-sun-fill", !isDark); 
        document.getElementById("themeIndicator").classList.toggle("bi-moon-fill", isDark);
    }
    catch{}
}

/**
 * Validate text input fields by checking for emptiness and disallowed special characters.
 * @returns {Array} - [isValid (bool), reasons (string[])]
 */
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

/** Check if the viewport dimensions are below a certain threshold and display a warning message if so. */
function checkWindowSize() {//BBB
    let vw = window.innerWidth;
    let vh = window.innerHeight;

    if ((vw < 300) || (vh < 300)) {
        $("#tooSmall").removeClass("d-none");
    } else {
        $("#tooSmall").addClass("d-none");
    }
}

/** Determine if a given RGB color is considered "dark" based on its luminance.
 * @param {string} rgb - format: "rgb(r g b)"
 * @returns {boolean}
 */
function isBackgroundDark(rgb) {//PR
    // determine if a background color is dark or light. found it on the internet

    // Uses the ITU-R BT.601 luminance formula to estimate perceived brightness
    const [r, g, b] = rgb.substring(4, rgb.length - 1).split(" ").map(Number);
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    return brightness < 128;
    
    
    // Source: standard perceptual luminance formula (0.299R + 0.587G + 0.114B)
    // Commonly used in accessibility and theming utilities

}

/**
 * Return a color from a predefined gradient based on the difficulty level.
 * @param {number} nehezseg - difficulty level (1-10)
 * @returns {string} - RGB color string
 */
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

/**
 * Abstract away the retrieval of input field values for task creation/editing forms, handling different ID conventions.
 * @param {string} idBase - base ID of the field (may include "-s" suffix for creation)
 * @param {string} hol - context string to determine if it's creation or editing form
 * @returns {string} - value of the appropriate input field
 */
function getField(idBase, hol) {//PR
    //get the value of an input field, compicated by some call/id name shenanigans
    var edit = idBase.includes("-s") ? idBase.substring(0, idBase.length -2) : idBase; //task creation has slim (-s sufix) version, but we just need the base
    return hol.includes("alfeladatBox") ? $(`#${idBase}`).val().toString() : $(`#${edit}Edit`).val().toString(); //return the value of the correct field
}                                               //creation                      //editing


/** Display an error message in a designated area, fading it out after a few seconds.
 * @param {string} msg - error message to display
 */
function showErrorMsg(msg) {//BBB
    $("#errorMsg").css("opacity", 1.0);
    $("#errorMsg").html(msg)

    $("#errorMsg").show()

    setTimeout(() => {
        $("#errorMsg").css("opacity", 0.0);
    }, 3000);
}

/** Display a toast message with a given title, body, and color. Automatically hides after 5 seconds.
 * @param {string} title - title of the toast message
 * @param {string} msg - body of the toast message
 * @param {string} type - type of the toast message (success, danger, warning...)
 */
function toastMsg(title, msg, type) {//PR
    //toast message for user feedback, its pretty self explanatory
    let piritos = document.getElementById("toast")
    
    piritos.querySelector('#toast-tile').textContent = title;
    piritos.querySelector('.toast-body').textContent = msg;

        //type = success, danger, warning... (bootstrap colors)
    let color = `bg-${type}`;
    piritos.querySelector(".toast-header").classList.remove(piritos.querySelector(".toast-header").classList[1]);
    piritos.querySelector(".toast-header").classList.add(color);    //remove the old color and add the new one

    piritos.classList.add("show");
    setTimeout(() => { //show it for 5 seconds
        piritos.classList.remove("show");
    }, 5000);
}

/** Generate a random integer between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number} 
 */
function rnd(min, max) {//PR
    //random number between min and max inclusive
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}
/** Generate a random RGB color string in the format "rgb(r g b)".
 * @returns {string}
 */
function randomHatterszin(){ //PR
    //random rgb value
    return `rgb(${rnd(0, 255)} ${rnd(0, 255)} ${rnd(0, 255)})`;
}

/** Check if an input field contains only numbers and is within a given range.
 * @param {HTMLInputElement} input - the input field to check
 * @param {number} max - the maximum allowed value
 */
function checkNumber(input, max){  //PR
    input.value = input.value.replace(/\D/g,'')         //regex meaning all non-digit characters  (d -> digit, D -> !digit)
    if(Number(max) && parseInt(input.value) > max) input.value = max     //max
    else if(parseInt(input.value) < 1)             input.value = '' //clear       
}

/**
 *  Format a byte size into a human-readable string with appropriate units (B, KB, MB, etc.).
 * @param {number|string} bytes - the size in bytes
 * @returns {string}
 */
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

/** Validate the size of a file input against a maximum limit, showing a warning and clearing the input if it exceeds the limit.
 * @param {HTMLInputElement} fileInput 
 * @param {string|null} fakeFileName - ID of the element that displays the fake file name
 */
function checkFileSize(fileInput, fakeFileName = null){//BBB, PR
    const file = fileInput.files[0];

    if (file && file.size > max_fajl_meret) { // dont let the user upload too large files
        toastMsg('Túl nagy a fájl', `A fájl mérete nem haladhatja meg a ${formatFileSize(max_fajl_meret)}-t.`, 'warning');
        fileInput.value = ''; //clear value and fake value
        if (fakeFileName) document.getElementById(fakeFileName).textContent = "Nincs fájl kiválsztva";
    }
}


//--- DOM tools ---//

/**
 * Query a child element within a container using a data-bind attribute.
 * @param {HTMLElement} container
 * @param {string} key
 * @returns {HTMLElement|null}
 */
const $bind = (container, key) => 
    container.querySelector(`[data-bind="${key}"]`);

/** Toggle the visibility of an element within a container based on a key and a boolean flag.
 * @param {HTMLElement} container 
 * @param {string} key 
 * @param {boolean} show 
 */
function showElement(container, key, show) {
    const element = $bind(container, key);
    if (element) {
        element.classList.toggle('d-none', !show);
    }
}

/** Set the background color of an element within a container based on a key and an RGB string.
 * @param {HTMLElement} container 
 * @param {string} key 
 * @param {string} rgb 
 */
function setBgColor(container, key, rgb) {
    const element = $bind(container, key);
    if (element) {
        element.style.backgroundColor = rgb;
    }
}
    
/** Prevent a button's click event from propagating to parent elements, 
 * which can be useful in cases where the button is inside a clickable container.
 * @param {HTMLButtonElement} btn 
 */
function preventParentClick(btn){
    btn.onclick = function(e){
        e.stopPropagation();
    }
}


/** Highlight occurrences of a search term within a given text by wrapping 
 * matches in <mark> elements, and insert the result into a target element.
 * @param {string|null} keres - The search term to highlight
 * @param {string} text - The text to search within
 * @param {HTMLElement} textHely - The element where the highlighted text should be inserted
 */
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

/** Escape special regex characters in a string to be used in a regex pattern.
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
