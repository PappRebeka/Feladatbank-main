/* ------ CONTENT ------
users.js -------------
    - FelhasznaloClick    -RD?
    - felhasznalokTolt    -PR
    - athelyezOnLoad      -RD
    - jogChange           -PR
    - AthelyezUser        -RD
*/


function FelhasznaloClick(id){ //RD?
    felhasznaloSetModal(0, id);
    selectionReset()
}

function felhasznalokTolt(item){ //PR    
    const div = felhasznaloCardTemplate()

    if (item.id == CurrentUserData.id) {
        div.firstChild.classList.add('noHover');
        div.setAttribute('data-bs-toggle', 'modal')
        div.setAttribute('data-bs-target', '#tanarAdatai')
        div.addEventListener('click', () => FelhasznaloClick(item.id))
    }

    div.querySelector('#hatter').style.backgroundColor = `${item.HatterSzin}`
    div.querySelector('#letter').classList.add(`text-${isBackgroundDark(item.HatterSzin) ? "light" : "dark"}-important`)
    div.querySelector('#letter').textContent = item.Nev[0].toUpperCase()

    const udata = $bind(div, 'userData').children
    udata[0].id = `UserName_${item.id}`

    let text = item.Nev
    highlightKeresettText(ActiveFilters.kereso, text, udata[0].children[1])
    

    udata[1].children[1].textContent += item.Email

    udata[2].id = `jogText_${item.id}`
    udata[2].children[1].textContent += item.Jogosultsag

    const buttons = $bind(div, 'buttons').querySelectorAll('button')
    buttons[0].id = `tanarGomb_${item.id}`
    buttons[1].id = `adminGomb_${item.id}`

    buttons[0].classList.add(`btn-${item.Jogosultsag == "Tanár" ? "primary" : "dark"}`)
    buttons[1].classList.add(`btn-${item.Jogosultsag != "Tanár" ? "primary" : "dark" }`)

    buttons[0].addEventListener('click', () => {jogChange(item.id, buttons[1], buttons[0], item.Nev)})
    buttons[1].addEventListener('click', () => {jogChange(item.id, buttons[0], buttons[1], item.Nev)})

    document.getElementById("BigDih").appendChild(div)

    if (item.id == CurrentUserData.id) {
        document.getElementById(`adminGomb_${item.id}`).disabled = true;
        document.getElementById(`tanarGomb_${item.id}`).disabled = true;
    }

    const footer = document.querySelector("#tanarAdatai .modal-footer")
    footer.innerHTML = `<button type="button" class="btn btn-danger data-bs-dismiss="modal">Törlés</button>
                        <button type="button" class="btn btn-info" data-bs-toggle="modal" data-bs-target="#intezmenyValt">Áthelyezés</button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Bezárás</button>`

    footer.children[0].addEventListener('click', () => DeleteSelectedUser())
    footer.children[1].addEventListener('click', () => athelyezOnLoad())
}

function athelyezOnLoad(){ //RD
    var intezmenyek = ajax_post("/getUserIntezmeny", 1, { uid: userId_ToChangeInstitute })
    IntezmenyAthelyezTolt(intezmenyek.results)
}

function jogChange(id, from, to, nev){ //PR
    from.classList.remove("btn-primary")
    from.classList.add("btn-dark")

    to.classList.add("btn-primary")
    to.classList.remove("btn-dark")

    document.getElementById(`jogText_${id}`).innerHTML = to.innerText
    
    const result = ajax_post("/changeJog", 1, { id: id, mire: to.innerText })
    
    if (result.success) {
        toastMsg("Jogostultság frissítve", `A(z) ${nev} felhasználó mostantól ${to.innerText}`, 'info');
    } else {
        toastMsg("Hiba", result.error || "Nem sikerült frissíteni a jogosultságot", "danger")
    }
}

function AthelyezUser(){ //RD
    var hova = document.getElementById("ujIntezmeny").value
    
    const result = ajax_post("/AthelyezUser", 1, { hova: hova, userId: userId_ToChangeInstitute })
    
    if (result.success) {
        toastMsg("Sikeres művelet", "A felhasználó sikeresen áthelyezve", "success")
    } else {
        toastMsg("Hiba", result.error || "Nem sikerült áthelyezni a felhasználót", "danger")
    }
}