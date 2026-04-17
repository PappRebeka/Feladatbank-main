/* ------ CONTENT ------
helpers.js -------------
    - killCookie        -RD, PR  delete a cookie by name
    - getCookie         -RD      retrieve a cookie value by name
    - setThemeCookie    -PR      set a cookie to track theme preference
    - themeSwitch       -PR      toggle theme and update cookie
    - setLocationCookie -PR      set cookies to track current page and selected item
*/

/** Delete a cookie by name.
 * @param {string} name - cookie name
 */
function killCookie(name) { //RD, PR
    // we delete a cookie by setting its expiration date to the past
    const date = new Date();
    date.setFullYear(date.getDate() - 32); //get vanilla iced bitch
    document.cookie = `${name}=${(name.includes('current') ? 'null' : '0')}; expires=${date.toUTCString()}; path=/; SameSite=Lax`
}                 // most cookies contain numbers, except the location handlers (currentPage, currentKikapcsId)


/** Set a cookie to track the user's theme preference (dark or light mode).
 * @param {bool} state 
 */
function setThemeCookie(state){ //PR
    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)
    document.cookie = `darkMode=${state ? "1" : "0"}; expires=${date.toUTCString()}; path=/; SameSite=Lax;`
}

/** Retrieve the value of a cookie by name.
 * @param {string} name - cookie name
 * @returns {string|null} - the value of the cookie with the given name, or null if not found 
 */
function getCookie(name) { //RD?
    const cookies = document.cookie.split("; ");
    for (let c of cookies) {
        const [key, value] = c.split("=");
        if (key === name) return value;
    }
    return null;
}

/** Update a cookie's value and expiration date.
 * @param {string} name - cookie name
 * @param {string} value - cookie value
 * @param {Date} expiryDate - cookie expiry date (optional)
 */

function setCookie(name, value, expiryDate) {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};`;
    if (expiryDate) { cookie += ` expires=${expiryDate.toUTCString()};`; }
    cookie += ` path=/; SameSite=Lax;`

    document.cookie = cookie;
}

/** Toggle between light and dark themes, update the theme cookie, and apply the new theme. */
function themeSwitch(){ //PR
    const state = document.getElementById("themeIndicator").classList.contains("bi-sun-fill") // if its light we're setting to dark
    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)
    setCookie('darkMode', state ? '1' : '0', date)
    //setThemeCookie(state)
    checkDarkMode()
}

/** Set cookies to track the user's current page and selected item, allowing for state persistence across sessions.
 * @param {string} where - the current page name
 * @param {string} kikapcsId - the ID of the selected item
 */
function setLocationCookie(where, kikapcsId){ //PR
    var date = new Date();
    date.setFullYear(date.getFullYear() + 10)

    setCookie('currentPage', where, date)
    setCookie('currentKikapcsId', kikapcsId, date)
}
