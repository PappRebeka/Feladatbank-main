/* ------ CONTENT ------
users.js -------------
    - userCardClick         -RD
    - loadUsers             -PR
    - moveUserClick         -RD
    - updateUserAuth        -PR
    - moveUserInstitution   -RD
*/


async function userCardClick(id){ //RD
    userId_ToChangeInstitute = id
    await setUserModal(0, id);
    await selectionReset()

    //update buttons here
    let jog = document.querySelector(`#jogText_${id} span`).innerText
    var ableToBeMoved = jog == "Tanár" || CurrentUserData.Jogosultsag == "Főadmin"
    
    const footer = document.querySelector("#tanarAdatai .modal-footer")

    // Benett: intezmenyValt button will be disabled if this returns true
    // It checks if there are enough institutes for the admin to be able
    // to change the user's institute
    let notEnoughInstitutes = await ajax_post("/instituteAmountNotEnough", 1, {}, false);
    /*if(notEnough["result"]) { 
        const instituteButton = footer.querySelector("#intezmenyValt");

        instituteButton.classList.add("disabled");
        instituteButton.setAttribute("aria-disabled", true);
    }*/

    let htmlString = ``
    if (ableToBeMoved) {
        htmlString += `<button type="button" class="btn btn-danger" data-bs-dismiss="modal">
                          <i class="bi bi-trash-fill"></i>&nbsp;
                          Törlés
                      </button>`

        if (!(notEnoughInstitutes["result"])) {
            htmlString += `<button type="button" class="btn btn-info" data-bs-toggle="modal" data-bs-target="#intezmenyValt">
                                <i class="bi bi-arrow-left-right"></i>&nbsp;
                                Áthelyezés
                            </button>`
        }
    }

    htmlString += `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="bi bi-x"></i>&nbsp;
                        Bezárás
                    </button>`

    footer.innerHTML = htmlString;  
                        
    if(ableToBeMoved){
        footer.children[0].onclick = async () => {await deleteThisUser(item.id); await loadPageData()}
        footer.children[1].onclick = async () => await moveUserClick()
    }
}


async function loadUsers(item){ //PR    
    const div = felhasznaloCardTemplate()
    div.id = 'UserCard_'+item.id
    if (item.id == CurrentUserData.id) {
        div.firstChild.classList.add('noHover');
    }
    else{
        div.setAttribute('data-bs-toggle', 'modal')
        div.setAttribute('data-bs-target', '#tanarAdatai')
        div.onclick = async () => await userCardClick(item.id)
    }

    div.querySelector('#hatter').style.backgroundColor = `${item.HatterSzin}`
    div.querySelector('#letter').classList.add(`text-${isBackgroundDark(item.HatterSzin) ? "light" : "dark"}-important`)
    div.querySelector('#letter').textContent = item.Nev[0].toUpperCase()

    const udata = $bind(div, 'userData').children
    udata[0].id = `UserName_${item.id}`

    let text = item.Nev
    highlightSearchedText(ActiveFilters.kereso, text, udata[0].children[1])
    

    udata[1].children[1].textContent = item.Email

    udata[2].id = `jogText_${item.id}`
    udata[2].children[1].textContent = item.Jogosultsag

    const buttons = $bind(div, 'buttons').querySelectorAll('button')
    buttons[0].id = `tanarGomb_${item.id}`
    buttons[1].id = `adminGomb_${item.id}`

    buttons[0].classList.add(`btn-${item.Jogosultsag == "Tanár" ? "primary" : "dark"}`)
    buttons[1].classList.add(`btn-${item.Jogosultsag != "Tanár" ? "primary" : "dark" }`)

    buttons[0].onclick = async () => await updateUserAuth(item.id, buttons[1], buttons[0], item.Nev)
    buttons[1].onclick = async () => await updateUserAuth(item.id, buttons[0], buttons[1], item.Nev)

    document.getElementById("BigDih").appendChild(div)

    if (item.id == CurrentUserData.id) {
        document.getElementById(`adminGomb_${item.id}`).disabled = true;
        document.getElementById(`tanarGomb_${item.id}`).disabled = true;
    }
}

async function moveUserClick(){ //RD
    var intezmenyek = await ajax_post("/getUserIntezmeny", 1, { uid: userId_ToChangeInstitute }, false)
    autofillOtherInstitutions(intezmenyek.results)
}

async function updateUserAuth(id, from, to, nev){ //PR
    from.classList.remove("btn-primary")
    from.classList.add("btn-dark")

    to.classList.add("btn-primary")
    to.classList.remove("btn-dark")

    document.getElementById(`jogText_${id}`).children[1].textContent = to.textContent
    
    const result = await ajax_post("/changeJog", 1, { id: id, mire: to.textContent }, false)
    
    if (result.ok) {
        toastMsg("Jogostultság frissítve", `A(z) ${nev} felhasználó mostantól ${to.textContent}`, 'info');
    } else {
        toastMsg("Hiba", "Nem sikerült frissíteni a jogosultságot", "danger")
    }
}

async function moveUserInstitution(){ //RD
    var hova = document.getElementById("ujIntezmenySelect").value
    const result = await ajax_post("/AthelyezUser", 1, { hova: hova, userId: userId_ToChangeInstitute }, false)
    console.log(hova)
    if (result.ok) {
        toastMsg("Sikeres művelet", "A felhasználó sikeresen áthelyezve", "success")
        if (CurrentUserData.Jogosultsag != 'Főadmin') { // nem tudja a saját intézményébe áthelyezni úgyhogy az nem kell vizsgálni
            let user = document.getElementById('UserCard_'+userId_ToChangeInstitute);
            user.replaceChildren()
            user.remove()
        }

    } else {
        toastMsg("Hiba", "Nem sikerült áthelyezni a felhasználót", "danger")
    }
}