/* ------ CONTENT ------
helpers.js -------------
    - killCookie        -PR
    - getCookie         -RD?
    - setThemeCookie    -PR
    - thheeSwitch       -PR
    - setLocationCookie -PR
*/

function killCookie(name) { //PR
    // we delete a cookie by setting its expiration date to the past
    const date = new Date();
    date.setFullYear(date.getDate() - 32); //get vanilla iced bitch
    document.cookie = `${name}=${(name.includes('current') ? 'null' : '0')}; expires=${date.toUTCString()}`
}                 // most cookies contain numbers, except the location handlers (currentPage, currentKikapcsId)

function getCookie(name) { //RD?
    const cookies = document.cookie.split("; ");
    for (let c of cookies) {
        const [key, value] = c.split("=");
        if (key === name) return value;
    }
    return null;
}

function setThemeCookie(state){ //PR
    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)
    document.cookie = `darkMode=${state ? "1" : "0"}; expires=${date.toUTCString()}`
}

function themeSwitch(){ //PR
        var classList = document.getElementById("themeIndicator").classList
        const state = classList.contains("bi-sun-fill")
        setThemeCookie(state)
        htmlElement.classList.toggle('darkMode', state);
        classList.toggle("bi-sun-fill")
        classList.toggle("bi-moon-fill")
    }


function setLocationCookie(where, kikapcsId){ //PR
    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)
    document.cookie = `currentPage=${where}; expires=${date.toUTCString()}`
    document.cookie = `currentKikapcsId=${kikapcsId}; expires=${date.toUTCString()}`
}
