/* ------ CONTENT ------
account.js -------------
    - setUserData           -PR 
    - resetUserOptions      -PR 
    - buildButtonWithIcon   -PR
    - allowUserDataEdit     -PR
    - changeFieldToInput    -PR
    - setFieldToText        -PR, BBB
    - saveUserData          -PR
    - deleteThisUser        -PR
    - getPageOptionsFor     -PR
*/

async function setUserData(){//PR

    if (!CurrentUserData.id) {
        let utoken = sessionStorage.getItem("userToken")
        let response = await ajax_post("/GetUserData", 1, {UserToken: utoken})

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

function allowUserDataEdit(){ //PR
    // let the users data to be edited on buttonclick
    
    const cancelButton = buildButtonWithIcon('bi-x-lg', ['fs-5'])
    cancelButton.addEventListener('click', () => resetUserOptions())
    cancelButton.classList.add('ms-3')
    document.getElementById("visszagomb").replaceChildren(cancelButton);

    const editNameButton = buildButtonWithIcon('bi-pencil-square', ['fs-5'])
    editNameButton.addEventListener('click', () => changeFieldToInput('usernev'))

    var editEmailButton
    if (CurrentUserData.id != 2){
        editEmailButton = buildButtonWithIcon('bi-pencil-square')
        editEmailButton.addEventListener('click', () => changeFieldToInput('emailcim'))
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

    options.children[1].addEventListener('click', () => saveUserData())
    options.children[0].addEventListener('click', () =>{window.location.href=`/passreset.html?email=${CurrentUserData.Email}`;
                                                         toastMsg('Helyreállító email külve.', '')})

    document.getElementById('userOptions').appendChild(options)
}

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

function setFieldToText(which){//PR
    // set the now changed name or email field back to normal text
    const target = document.getElementById(which) 
    const button = buildButtonWithIcon('bi-pencil-square', ['fs-5'])

    const mezo = document.getElementById("mezo").value;
    if (which == "usernev") { //if its just a name change its simple
        //CurrentUserData.Nev = mezo // update global data
        button.addEventListener('click', () => changeFieldToInput('usernev'))

        target.textContent = mezo

        document.getElementById("letter").textContent = mezo[0].toUpperCase();    //set the input back to text
        document.getElementById("Letter").textContent = mezo[0].toUpperCase();   //and update the user icons 
    } else {
        button.addEventListener('click', () => changeFieldToInput('emailcim'))

        target.textContent = mezo
                       
    }
    target.appendChild(button)
}

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
        const isRegistered = await ajax_post("/isRegistered", 0, { email: newEmail })
        const isValidEmail = emailPattern.test(newEmail)

        if (isRegistered || !isValidEmail){
            if(isRegistered) toastMsg("Az email használatban van", "Nem sikerült az emailcím megváltoztatása, mivel ez az emailcím már használatban van", "warning");
            else             toastMsg("Nem megfelő formátum", "A megadott emailcím formátuma helytelen", "warning");
            
            return;
        }
    }
    
    const result = await ajax_post("/updateUserdata", 1, { userToken: sessionStorage.getItem("userToken"), newNev: newNev, newEmail: newEmail });

    if(result.success){
        CurrentUserData.Email = newEmail
        CurrentUserData.Nev = newNev

        toastMsg("Sikeres művelet", "A felhasználói adatok frissítve lettek", "success");
        resetUserOptions();// set the UI back to normal
        return
    }

    if (result.error === 'username_exists') {
        showErrorMsg("Felhasználónév foglalt", "Ezt a felhasználónevet már használja valaki! Kérjük válasszon másikat!");
        return;
    } else if (result.error || !result.success) {
        toastMsg("Hiba", "Az adatok frissítése során hiba történt: "+result.error, "danger");
        return;
    }

    resetUserOptions()
        
}

async function deleteThisUser(id){//PR
    if(id == CurrentUserData.id && CurrentUserData.Jogosultsag == "Főadmin"){  // prevent deleting main admin
        toastMsg("Tiltott művelet!", "A főadmin nem törölhető", "danger")
    }
    else{   // proceed with deletion
        const result = await ajax_post("/deleteUser", 1, { id: id });
        
        if (result.success) {
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

function getPageOptionsFor(jog){ //PR
    var minors = [];
    
    for (const key in AvailablePages) {
        if (!Object.hasOwn(AvailablePages, key)) continue;
        
        const element = AvailablePages[key];
        if (element.requredJogosultsag.includes(jog)){
            let div = document.createElement('div')
            div.classList.add('navOptionButton','btn','btn-light','w-100', 'my-2')
            div.setAttribute('data-bs-dismiss', 'offcanvas')
            div.addEventListener('click', () => switchTo(key, div.id))
            div.id = element.pageId
            if(key == ActiveLocation) div.classList.add('disabled')
            div.textContent = key

            minors.push(div)
        }
        
    }
    return minors
}
