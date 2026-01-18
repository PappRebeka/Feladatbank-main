function updateGombok(){ //RD
    const elso = document.getElementById("elso")
    const elozo = document.getElementById("elozo")
    const kovetkezo = document.getElementById("kovetkezo")
    const utolso = document.getElementById("utolso")
    
    const isElso = activePageNumber <= 1
    const isUtolso = activePageNumber >= maxPageNumber

    elso.disabled = isElso;
    elozo.disabled = isElso;
    utolso.disabled = isUtolso;
    kovetkezo.disabled = isUtolso;
}

function Lapozz(merre, mennyit){ //RD
    if(merre == "tovabb"){
        if(mennyit == "1"){//következő lap
                // az oldalszámlálóhoz +1 pl 2.oldalról => 3.oldalra változik
            activePageNumber++
            //az offsetet egy oldalnyi feladattal toldjukk meg tehát a limmittel pl a limit 30 ezért az első oldalon az 1-30. feladat jelenik meg. A gombnyomás után az offset 30 ezért a 31-60. feladat jelenik meg
            offset = (activePageNumber - 1) * limit // ha pl a második oldalon változtatkjuk az ablak méretét akkor is jól fogja számítani az offsetet
        } else{ //az utolsó oldal
            //ez lesz az utolsó oldal, Math.ceil azért kell mert maradhat nem teljesen kitöltött oldal pl 60db feladat van a limit 30, ezért az utolsó(3. oldalon) csak 10 feladat lesz, ha csak 2 oldal van akkor levágunk 10 feladatot
            
            
            activePageNumber = Math.ceil(resultsCount/limit)
            // az offset az oldalak száma * limit a (-1) az az utolsó csonka oldal levonása pl 170 feladat limit 30 ezért 6 oldal lesz, az offset így (6-1)*30 ami 150 ezért csak az az utolsó 20 feladat jelenik meg
            offset = (activePageNumber - 1)*limit
        }      
    }
    else{
        if (mennyit == "1"){
            // az oldalszámlálóhoz -1 pl 2.oldalról => 1.oldalra változik
            activePageNumber--;
            // a következő oldalra lépés logikájának az ellentéte
            offset = (activePageNumber - 1) * limit;
        }
        else{
            //magától értetődő a legelső oldal gombnál a activePageNumber 1 lesz
            activePageNumber = 1
            //az offset nullázódik
            offset = 0
        }
    }
    updateGombok()
    window.scrollTo(0, 0);
    setPageContent()
}

function LimitOffset(){ //PR
    let width = window.innerWidth
    let sizes = [576 , 768 , 992 , 1200]
    let count = ActiveLocation == "Felhasználók" ? 3 : 6 // count in a row
    var voltLimit = limit
    limit = (sizes.indexOf(sizes.find(a => width < a))) == -1 ? (6 * count) // if larger than 1200px then 6 times count
                    : (sizes.indexOf(sizes.find(a => width < a)) + 1) * count // else index + 1 times count
    
    if(voltLimit != limit){
        maxPageNumber = Math.max(1, Math.ceil(resultsCount / limit))
        document.getElementById("maxPageNumber").textContent = maxPageNumber
    }
    return (voltLimit != limit)
}