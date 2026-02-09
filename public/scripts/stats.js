/* ------ CONTENT ------
stats.js ---------------
  - setUserModal         -PR, RD    
  - statToggle           -PR
  - selectionReset       -RD?
  - DefaultStat          -RD
  - MegosztottStat       -RD
  - KozzetettStat        -RD
  - avgNehezsegStat      -RD
  - isDatasetEmpty       -RD
  - evfArchivaltStat     -RD
  - constructArchDataset -RD
  - top3Data             -RD, PR
  - createChart          -RD, PR
  - createStatisticCard  -RD, PR
  - StatisztikaOnLoad    -RD
*/ 

async function setUserModal(statLap, id){ //PR, RD
    if(id != undefined) StatUserId = id
    //userId_ToChangeInstitute = id
    const tanarAdatai = document.querySelector("#modalTanarContent")
    tanarAdatai.replaceChildren()

    let nev = document.getElementById("UserName_"+StatUserId).innerText
    let nevh2 = document.createElement('h2'); nevh2.textContent = nev
    document.querySelector("#tanarAdatai .modal-header").replaceChildren(nevh2)
    var ctx = document.getElementById('diagramHely');
    var labels = []
    var dataset = []
    
    var temp;
    switch (statLap){
        case 2:
            temp = await MegosztottStat()
            modalTanarContent.innerHTML = "<p class='my-2 h5 text-center'>Megosztott feladatok száma tanáronként</p>"
            break;
        case 3:
            temp = await KozzetettStat()
            modalTanarContent.innerHTML = "<p class='my-2 h5 text-center'>Közzétett feladatok száma kurzusonként</p>"
            break;
        default:
            temp = await DefaultStat()
            modalTanarContent.innerHTML = "<p class='my-2 h5 text-center'>Feladatok eloszlása kategóriánként</p>"
            break;
    }

    labels = temp.labels;
    dataset = temp.dataset; 
    
    if(ujChart){
        ujChart.destroy()
        ujChart = null
    }
    if(!isDatasetEmpty(dataset)){
        ujChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [
                {
                    data: dataset,
                }]},
            options:{
                responsive: true,
                maintainAspectRatio: false,
                useRandomColors: true
            }
                
        })
        tanarAdatai.style.height = ''
    }
    else{
        tanarAdatai.classList.add("d-flex", "justify-content-center", "align-items-center")
        tanarAdatai.style.height = '30vh'
        tanarAdatai.replaceChildren(nincsAdatTemplate())
        ctx.style.height = 0
    }
}

async function statToggle(chosenOne, page){ //PR
    if(StatPageCounter == page) return; //if the user clicks the same button again, dont do anything

    let id = chosenOne.id+"Stat" //get the corresponding label id

    for (const element of document.querySelector("#chips").querySelectorAll('label.btn')) {
        let i = element.id.replace("Stat","")

        document.getElementById(i).checked = false
        element.classList.add("btn-light")  //turn off the buttons mechanichally and visually
        element.classList.remove("btn-outline-light")    
    }

    document.getElementById(id).classList.add("btn-outline-light")
    document.getElementById(id).classList.remove(`btn-light`)
    chosenOne.checked = true    //turn on the clicked button 
    StatPageCounter = page     //set the global page counter
    await setUserModal(page) //set the modal content based on the clicked button
}

async function selectionReset(){//RD?
    await statToggle(document.getElementById("Letrehozott"), 1)
}

async function DefaultStat(){//RD
    var generalFeladatok = await ajax_post("/generalFeladatokData", 1, { felhId: StatUserId }, false)
    var Letrehozott = generalFeladatok.FeladatDB
    var Kozzetett = generalFeladatok.KozzetettDB
    var Megosztott = generalFeladatok.MegosztottDB

    //szinek = hslSzinGeneral(3)
    labels = ["Létrehozott feladatok", "Közzétett feladatok", "Megosztott feladatok"]
    dataset = [Letrehozott, Kozzetett, Megosztott]
    
    return {labels, dataset}
}

async function MegosztottStat(){//RD
    //var baseData = await ajax_post("/ChartDataGet?statLap=2&statCaller="+StatUserId).results
    //await ajax_post(`megosztottFeladatokData?felhId=${StatUserId}`)
    var megosztottFeladatok = await ajax_post("/megosztottFeladatokData", 1, { felhId: StatUserId }, false)
    var labels = []
    var dataset = []
    //var szinek = hslSzinGeneral(megosztottFeladatok.results.length)
    for (const lama of megosztottFeladatok.results) {
        labels.push(lama.Nev)
        dataset.push(lama.Darabszam)
    }
    return {labels, dataset}
}

async function KozzetettStat(){//RD
    //var baseData = await ajax_post("/ChartDataGet?statLap=3&statCaller="+StatUserId).results
    var kozzetettFeladatok = await ajax_post("/kozzetettFeladatokData", 1, { felhId: StatUserId }, false)
    var labels = []
    var dataset = []
    //var szinek = hslSzinGeneral(kozzetettFeladatok.results.length)
    for (const lama of kozzetettFeladatok.results) {
        labels.push(lama.kurzusNev)
        dataset.push(lama.Darabszam)
    }
    return {labels, dataset}
}

async function avgNehezsegStat(){//RD
    //var baseData = await ajax_post("/ChartDataGet?statLap=3&statCaller="+StatUserId).results
    var avgFeladatok = await ajax_post("/averageNehezsegData", 1, { felhId: StatUserId }, false)
    var labels = []
    var dataset = []
    //var szinek = hslSzinGeneral(avgFeladatok.results.length)
    for (const lama of avgFeladatok.results) {
        labels.push(lama.kurzusNev)
        dataset.push(lama.atlagNehezseg)
    }
    return {labels, dataset}
}

function isDatasetEmpty(dataset){ //RD
    for (const data of dataset) {
        if (data != 0) return false 
    }   
    return true
}

async function evfArchivaltStat(){//RD
    var evfFeladatok = await ajax_post("/evfolyamArchivaltData", 1, { felhId: StatUserId }, false)
    var labels = []
    var dataset = []
    var dataset1 = []
    var dataset2 = []
    //var szinek = hslSzinGeneral(avgFeladatok.results.length)
    for (const lama of evfFeladatok.results) {
        labels.push(lama.Evfolyam)
        dataset1.push(lama.ArchDB)
        dataset2.push(lama.SimaDB)
    }
    var dataset1 = constructArchDataset(labels, dataset1)
    var dataset2 = constructArchDataset(labels, dataset2)
    labels= [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

    dataset.push(dataset2, dataset1)
    return {labels, dataset}
}

function constructArchDataset(evfolyamok, alapDataset){//RD
    var ujDataset = []
    for (let i = 1; i < 14; i++) { //[1, 2, 3, 4, 5]
        if(evfolyamok.includes(i)){//['', '', 3, 4, ''] => //[3, 4]
            ujDataset.push(alapDataset[evfolyamok.indexOf(i)])
        }
        else{
            ujDataset.push(0)
        }
    }
    return ujDataset
}

async function top3Data(){//RD, PR
    var labels = []
    var feladatDb = []
    var dataset = [2, 3, 1]
    var adatok = await ajax_post("/topHaromTanarData", 1, {}, false)
    
    labels.push(adatok.results[1]?.Nev || "") //2.helyezett
    feladatDb.push(adatok.results[1]?.FeladatDb || 0)
    if(!adatok.results[1]) dataset[0] = 0 // if there is no 2nd place, set data to 0 so the chart shows it correctly

    labels.push(adatok.results[0].Nev) //1.helyezett
    feladatDb.push(adatok.results[0].FeladatDb)

    labels.push(adatok.results[2]?.Nev || "") //3.helyezett
    feladatDb.push(adatok.results[2]?.FeladatDb || 0)
    if(!adatok.results[2]) dataset[2] = 0 // same as above
    
    return {labels, feladatDb, dataset}
}

function createChart(hova, errorHova, tipus, cimkek, dataset, subtitleText, x, y, axis, feladatDb){//RD, PR
    // create the chart with the data provided. it got complicated quickly

    if(isDatasetEmpty(dataset)){ // no data case (issue!) needs a touchup
        errorHova.classList.add("d-flex", "justify-content-center", "align-items-center")
        errorHova.replaceChildren(nincsAdatTemplate())
        return
    }
    
    var ujChart = new Chart(hova, {
        type: tipus,
        data: {
            labels: cimkek,
            datasets: tipus == "line" ?
            [
                {
                    label: "Aktív",
                    data: dataset[0],
                },
                {
                    label: "Archivált",
                    data: dataset[1],
                }
            ] : [
            {
                data: dataset,                                                       // custom colors for top3 bar chart
                backgroundColor: (y == null && tipus == "bar") ? ["rgb(201, 192, 187)", "rgb(212, 175, 55)", "rgb(169, 113, 66)"] : undefined,
                    //only top3 has y = null, so i used that as identificaltion    
            }]},
        options:{
            indexAxis: axis,
            responsive: true,
            maintainAspectRatio: false,
            useRandomColors: y == null, // use the bult in random for non-top3 charts
            plugins: {
                subtitle: {
                    display: true,
                    text: [subtitleText, ''],
                },
                legend:{
                    display: tipus != "bar", //hide legend for bar charts
                    position: "right"
                },
                tooltip: { 
                    callbacks:{
                        label: function(context) {
                            if(!(y == null && tipus == "bar")) return context.raw
                            let i = context.dataIndex;
                            let value = feladatDb[i]; // custom tooltips for top3
                            return 'Feladatok száma: ' + value;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: x != null, 
                    title: {
                        display: true,
                        text: x,
                        color: "#db8d07"
                    }
                },
                y:{
                    display: y != null,
                    title: {
                        display: true,
                        text: y,
                        color: "#db8d07"
                    }
                }
            }
        }
    })
    return ujChart
}

async function createStatisticCard(){ //RD, PR
    var statAdat
    var tipus = ""
    var title = ""
    var sub = ""
    var x; var y;
    var axis = "x"
    var statHely = document.getElementById("statsHere")
    switch (generatedChartNumber) {
        case 1:
            statAdat = await MegosztottStat()
            tipus = "doughnut"
            title = "Megosztott feladatok"
            sub =  "Ön által megosztott feladatok száma tanáronként"
            break;
        case 2:
            statAdat = await KozzetettStat()
            tipus = "bar"
            title = "Közzétett feladatok"
            sub = "Közzétett feladatok száma kurzusonként"
            x = "Kuzus"; y = "Darab"
            break;
        case 3:
            statAdat = await avgNehezsegStat()
            tipus = "bar"
            title = "Kurzusonkénti nehézség"
            sub = "Feladatok átlagos nehézsége kurzusonként"
            x = "Kuzus"; y = "Átl. nehézség"; axis = "y"
            break;
        case 4:
            statAdat = await evfArchivaltStat()
            tipus = "line"
            title = "Évfolyamonkénti státusz"
            sub = "Feladatok státusza évolyamokra bontava"
            x = "Évfolyam"; y = "Darab"
            break;
        case 5:
            statAdat = await top3Data()
            tipus = "bar"
            title = "Feladat toplista"
            sub = "Legtöbb feladattal rendelkező tanárok"
            x = "Tanár"; y = null
            break;
    
        default:
            statAdat = await DefaultStat()
            tipus = "polarArea"
            title = "Feladatok összesítve"
            sub = "Feladatok elszlása kategóriánként"
            break;
    }
    var html = chartCardTemplate()
    html.querySelector('h3').textContent = title
    
    const wrapper = html.querySelector('.chart-wrapper');
    wrapper.id = `errorHere${generatedChartNumber}`;  

    const canvas = wrapper.querySelector('canvas');
    canvas.id = `statisztikaDia${generatedChartNumber}`; 

    document.getElementById("statsHere").appendChild(html)

    const ctx = document.getElementById(`statisztikaDia${generatedChartNumber}`);
    const errorHely = document.getElementById(`errorHere${generatedChartNumber}`); 

    createChart(ctx, errorHely, tipus, statAdat.labels, statAdat.dataset, sub, x, y, axis, statAdat.feladatDb)
    generatedChartNumber++;
}

async function StatisztikaOnLoad(){ //RD
    StatUserId = CurrentUserData.id;
    generatedChartNumber = 0
    for (let i = 0; i < 6; i++) {
        await createStatisticCard();
    }
}
