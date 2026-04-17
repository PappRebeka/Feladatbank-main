/* ------ CONTENT ------
account.js -------------
    - setUserData           -PR       fetch & render current user info
    - resetUserOptions      -PR       restore default account panel UI
    - buildButtonWithIcon   -PR       helper to create icon buttons
    - allowUserDataEdit     -PR       enable inline editing of name/email
    - changeFieldToInput    -PR       swap text field for input element
    - setFieldToText        -PR, BBB  revert input back to text with pencil
    - saveUserData          -PR       validate and send updated profile
    - deleteThisUser        -PR       handle user removal with safety checks
    - getPageOptionsFor     -PR       generate navigation items based on role
*/

/** Load current user data from the server (if not cached),
 * update session state, and render the profile section with
 * name, email, initials icon and background color.
 * Removes extraneous fields to keep CurrentUserData minimal.
 */
async function setUserData(){//PR

    if (!CurrentUserData.id) {
        let utoken = sessionStorage.getItem("userToken")
        let response = await ajax_post("/GetUserData", 1, {UserToken: utoken}, true)

        if(response.error == "ALREADY_LOGGED_IN") {
            window.location.href = "hiba.html?code=4"
            return;
        }
        CurrentUserData = response.dataset;
    }
    sessionStorage.setItem("loggedIn", true);
        
    
    let rgb = `${CurrentUserData.HatterSzin}`;
    document.querySelectorAll(".letter").forEach(a => {a.textContent = CurrentUserData.Nev[0].toUpperCase();
                                                       a.classList.add(`text-${isBackgroundDark(rgb) ? "light" : "dark"}-important`)})

    document.getElementById("usernev").textContent = CurrentUserData.Nev;
    document.getElementById("emailcim").textContent = CurrentUserData.Email;
    if(document.getElementById("jogosultsag")) document.getElementById("jogosultsag").textContent = CurrentUserData.Jogosultsag;

    document.getElementById("hatter").style.backgroundColor = rgb;
    document.getElementById("Hatter").style.backgroundColor = rgb;

    let {id, Nev, Email, Jogosultsag} = CurrentUserData;
    CurrentUserData = {id, Nev, Email, Jogosultsag}
}

/** Restore the account offcanvas to its default, non-editing state.
 * Rebuilds the details block and resets buttons/icons accordingly.
 */
function resetUserOptions(){//PR

    document.getElementById("details").innerHTML = `<div id="jogosultsag" class="big"></div>
                                                    <div id="usernev" class="fw-semibold"></div>
                                                    <div id="emailcim" class="text-muted small"></div>`
    document.getElementById("jogosultsag").textContent = CurrentUserData.Jogosultsag;
    document.getElementById("usernev").textContent     = CurrentUserData.Nev;
    document.getElementById("emailcim").textContent    = CurrentUserData.Email;
    
    document.getElementById("letter").textContent = CurrentUserData.Nev[0].toUpperCase();  
    document.getElementById("Letter").textContent = CurrentUserData.Nev[0].toUpperCase();


    document.getElementById("visszagomb").innerHTML = userOptionsDefaultButton();

    document.getElementById("options").classList.remove('d-none')
    document.getElementById("editUserOptions")?.remove()
}
  
/** Convenience factory for a <button> containing a Bootstrap icon.
 * @param {string} iconType - bi- class for desired icon
 * @param {string[]} [otherClasses] - additional classes for <i>
 * @returns {HTMLButtonElement}
 */
function buildButtonWithIcon(iconType, otherClasses){//PR
    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('btn')

    const i = document.createElement('i')
    i.classList.add('bi', iconType)
    if(otherClasses) i.classList.add(otherClasses)

    button.appendChild(i)
    return button
}

/** Enable inline editing of the user's name/email fields.
 * Swaps UI elements, adds pencil/cancel buttons and presents
 * save/delete options in the offcanvas panel.
 */
function allowUserDataEdit(){ //PR
    // let the users data to be edited on buttonclick
    
    const cancelButton = buildButtonWithIcon('bi-x-lg', ['fs-5'])
    cancelButton.onclick = () => resetUserOptions()
    cancelButton.classList.add('ms-3')
    document.getElementById("visszagomb").replaceChildren(cancelButton);

    const editNameButton = buildButtonWithIcon('bi-pencil-square', ['fs-5'])
    editNameButton.onclick = () => changeFieldToInput('usernev')

    var editEmailButton
    if (CurrentUserData.id != 2){
        editEmailButton = buildButtonWithIcon('bi-pencil-square')
        editEmailButton.onclick = () => changeFieldToInput('emailcim')
    }

    document.getElementById("details").innerHTML = //the stuff that can be edited -- name email
        `<div id="usernev" class="fw-semibold h3">
        
        </div>
        <div id="emailcim" class="text-muted small">

        </div>
        <div id="errorMsg" class="text-danger small"></div>`;

    document.querySelector('#details #usernev').textContent = CurrentUserData.Nev
    document.querySelector('#details #usernev').appendChild(editNameButton)

    document.querySelector('#details #emailcim').textContent = CurrentUserData.Email
    if (editEmailButton) document.querySelector('#details #emailcim').appendChild(editEmailButton)
                   
    document.getElementById("options").classList.add('d-none')

    const options = document.createElement("div")
    options.className = "offcanvas-body"; options.id = 'editUserOptions'
    options.innerHTML = // change pw via sending email, save changes, delete account
        `<button class="btn btn-light w-100 my-2">Jelszó módosítás</button>
         <button class="btn btn-success w-100 my-2">
            <i class="bi bi-check-lg"></i>&nbsp;
            Mentés
         </button>
         <button data-bs-toggle="modal" data-bs-target="#UserDel" class="btn btn-secondary w-100 my-2">
            <i class="bi bi-trash-fill"></i>&nbsp;
            Fiók törlése
         </button>`;

    options.children[1].onclick = async () => await saveUserData()
    options.children[0].onclick = () =>{window.location.href=`/passreset.html?email=${CurrentUserData.Email}`;
                                                         toastMsg('Helyreállító email külve.', '')}

    document.getElementById('userOptions').appendChild(options)
}

/** Replace a text field (name or email) with a text input so the
 * user can modify it. Focus is immediately set to the new input.
 * @param {'usernev'|'emailcim'} which
 */
function changeFieldToInput(which){//PR
    // change the name or email field to input field
    const input = document.createElement('input')
    input.type = 'text'
    input.id = 'mezo'
    input.classList.add('form-control')
    input.addEventListener('blur', () => setFieldToText(which))
    input.value = which == "usernev" ? CurrentUserData.Nev : CurrentUserData.Email
    
    document.getElementById(which).replaceChildren(input);
    document.getElementById('mezo').focus() // force focus
}

/** Reverse the edit field back to static text when the input
 * loses focus. Appends the pencil icon again for future edits.
 * @param {'usernev'|'emailcim'} which
 */
function setFieldToText(which){//PR
    // set the now changed name or email field back to normal text
    const target = document.getElementById(which) 
    const button = buildButtonWithIcon('bi-pencil-square', ['fs-5'])

    const mezo = document.getElementById("mezo").value;
    if (which == "usernev") { //if its just a name change its simple
        //CurrentUserData.Nev = mezo // update global data
        button.onclick = () => changeFieldToInput('usernev')

        target.textContent = mezo

        document.getElementById("letter").textContent = mezo[0].toUpperCase();    //set the input back to text
        document.getElementById("Letter").textContent = mezo[0].toUpperCase();   //and update the user icons 
    } else {
        button.onclick = () => changeFieldToInput('emailcim')

        target.textContent = mezo
                       
    }
    target.appendChild(button)
}

/** Validate and persist edited user profile information.
 * - checks whether name/email actually changed
 * - verifies email format and uniqueness
 * - sends update request to server, updates global state
 * - provides user feedback with toasts or error messages.
 */
async function saveUserData(){//PR, BBB
    // update the user data in the database
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ //simple email pattern by BBB

    const newNev   =  document.getElementById("usernev").innerText;
    const newEmail = document.getElementById("emailcim").innerText;
    
    const valtozottEmail = newEmail != CurrentUserData.Email 
    const valtozottNev   = newNev   != CurrentUserData.Nev 

    if(!valtozottEmail && !valtozottNev){
        resetUserOptions()
        return;
    } 

    if(valtozottEmail){
        const isRegistered = await ajax_post("/isRegistered", 0, { email: newEmail }, false)
        const isValidEmail = emailPattern.test(newEmail)

        if (isRegistered || !isValidEmail){
            if(isRegistered) toastMsg("Az email használatban van", "Nem sikerült az emailcím megváltoztatása, mivel ez az emailcím már használatban van", "warning");
            else             toastMsg("Nem megfelő formátum", "A megadott emailcím formátuma helytelen", "warning");
            
            return;
        }
    }
    
    const result = await ajax_post("/updateUserdata", 1, { userToken: sessionStorage.getItem("userToken"), newNev: newNev, newEmail: newEmail }, false);

    if(result.ok){
        CurrentUserData.Email = newEmail
        CurrentUserData.Nev = newNev

        toastMsg("Sikeres művelet", "A felhasználói adatok frissítve lettek", "success");
        resetUserOptions();// set the UI back to normal
        return
    }

    if (result.error === 'username_exists') {
        showErrorMsg("Felhasználónév foglalt", "Ezt a felhasználónevet már használja valaki! Kérjük válasszon másikat!");
        return;
    } else if (result.error || !result.ok) {
        toastMsg("Hiba", "Az adatok frissítése során hiba történt: "+result.error, "danger");
        return;
    }

    resetUserOptions()
        
}

/** Request deletion of a user account. Protects the primary admin
 * from self-deletion and redirects the current user if they delete
 * their own account.
 * @param {number} id - user id to remove
 */
async function deleteThisUser(id){//PR
    if(id == CurrentUserData.id && CurrentUserData.Jogosultsag == "Főadmin"){  // prevent deleting main admin
        toastMsg("Tiltott művelet!", "A főadmin nem törölhető", "danger")
    }
    else{   // proceed with deletion
        const result = await ajax_post("/deleteUser", 1, { id: id }, false);
        
        if (result.ok) {
            toastMsg("Sikeres művelet!", "A felhasználó törölve lett", "success")
        } else {
            toastMsg("Hiba", result.error || "Nem sikerült törölni a felhasználót", "danger")
            return;
        }
        
        if(id == CurrentUserData.id){
            setTimeout(() => { // redirect id the user deleted themselves
                window.location.href = "index.html"
            }, 2000);
        }
        
    }
}

/** Generate navigation option buttons for pages the current user
 * role is allowed to access. Options close the offcanvas and
 * call `switchTo` when clicked.
 * @param {string} jog - user role/permission string
 * @returns {HTMLElement[]} array of div elements
 */
function getPageOptionsFor(jog){ //PR
    var minors = [];
    
    for (const key in AvailablePages) {
        if (!Object.hasOwn(AvailablePages, key)) continue;
        
        const element = AvailablePages[key];
        if (element.requredJogosultsag.includes(jog)){
            let div = document.createElement('div')
            div.classList.add('navOptionButton','btn','btn-light','w-100', 'my-2')
            div.setAttribute('data-bs-dismiss', 'offcanvas')
            div.onclick = async () => await switchTo(key, div.id)
            div.id = element.pageId
            if(key == ActiveLocation) div.classList.add('disabled')
            div.textContent = key

            minors.push(div)
        }
    }
    return minors
}
