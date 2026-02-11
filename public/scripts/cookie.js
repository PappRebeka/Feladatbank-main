/* ------ CONTENT ------
helpers.js -------------
    - killCookie        -RD, PR
    - getCookie         -RD?
    - setThemeCookie    -PR
    - themeSwitch       -PR
    - setLocationCookie -PR
*/

function killCookie(name) { //RD, PR
    // we delete a cookie by setting its expiration date to the past
    const date = new Date();
    date.setFullYear(date.getDate() - 32); //get vanilla iced bitch
    document.cookie = `${name}=${(name.includes('current') ? 'null' : '0')}; expires=${date.toUTCString()}; path=/; SameSite=Lax`
}                 // most cookies contain numbers, except the location handlers (currentPage, currentKikapcsId)

function setThemeCookie(state){ //PR
    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)
    document.cookie = `darkMode=${state ? "1" : "0"}; expires=${date.toUTCString()}; path=/; SameSite=Lax;`
}

function getCookie(name) { //RD?
    const cookies = document.cookie.split("; ");
    for (let c of cookies) {
        const [key, value] = c.split("=");
        if (key === name) return value;
    }
    return null;
}

function setCookie(name, value, expiryDate) {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};`;
    if (expiryDate) { cookie += ` expires=${expiryDate.toUTCString()};`; }
    cookie += ` path=/; SameSite=Lax;`

    document.cookie = cookie;
}

function themeSwitch(){ //PR
    const state = document.getElementById("themeIndicator").classList.contains("bi-sun-fill") // if its light we're setting to dark
    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)
    setCookie('darkMode', state ? '1' : '0', date)
    //setThemeCookie(state)
    checkDarkMode()
}


function setLocationCookie(where, kikapcsId){ //PR
    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)

    setCookie('currentPage', where, date)
    setCookie('currentKikapcsId', kikapcsId, date)
    //document.cookie = `currentPage=${where}; expires=${date.toUTCString()}`
    //document.cookie = `currentKikapcsId=${kikapcsId}; expires=${date.toUTCString()}`
}
