// pretty sure this is unused, but the idea is not bad

class User {
    constructor(
        id,
        nev,
        email,
        jelszo,
        jogosultsag,
        hatterSzin,
        intezmenyId,
    ) {
        this.id = id;
        this.nev = nev;
        this.email = email;
        this.jelszo = jelszo;
        this.jogosultsag = jogosultsag;
        this.hatterSzin = hatterSzin;
        this.intezmenyId = intezmenyId;
    }  

    static fromObj(obj) {
        return new User(
            obj.id,
            obj.Nev,
            obj.Email,
            obj.Jelszo,
            obj.Jogosultsag,
            obj.HatterSzin,
            obj.IntezmenyId,
        )
    }
}

class Feladat {
    constructor (
        id,
        nev,
        leiras,
        evfolyam,
        tantargy,
        tema,
        nehezseg,
        tanar,
        archivalva,
    ) {
        this.id = id;
        this.nev = nev;
        this.leiras = leiras;
        this.evfolyam = evfolyam;
        this.tantargy = tantargy;
        this.tema = tema;
        this.nehezseg = nehezseg;
        this.tanar = tanar;
        this.archivalva = archivalva;
    }

    static fromObj(obj) {
        //console.log(obj);
        return new Feladat(
            obj.FeladatIdje,
            obj.Nev,
            obj.Leiras,
            obj.Evfolyam,
            obj.Tantargy,
            obj.Tema,
            obj.Nehezseg,
            obj.Tanar,
            obj.Archivalva,
        )
    }

    render() {
        return `
                <div id="thisDivHasAnIdOf${this.id}" class="feladatDiv col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2 p-2 m-0">
                      <div onclick="setModalContent(${this.id}, '${this.nev}', '${this.leiras}', ${this.evfolyam}, '${this.tantargy}', '${this.tema}', ${this.nehezseg}, '${this.tanar}')" class="card h-100bg-light" style="border: 4px solid ${borderColor(nehezseg)};" data-bs-toggle="modal" data-bs-target="#editFeladat">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${this.nev}</h5>
                            <p class="mb-1 p-1 card-text"><strong>Leírás:</strong> ${this.leiras}</p>
                            <p class="mb-1 p-1 card-text"><strong>Évfolyam:</strong> ${this.evfolyam}.</p>
                            <p class="mb-1 p-1 card-text"><strong>Tantárgy:</strong> ${this.tantargy}</p>
                            <p class="mb-1 p-1 card-text"><strong>Téma:</strong> ${this.tema}</p>
                            <p class="mb-1 p-1 card-text"><strong>Nehézség:</strong> ${this.nehezseg}/10</p>
                        </div>
                    </div>
                </div>
        `;
    }
}

class Alfeladat {
    constructor (
        id,
        leiras,
        feladatId,
        fajlId,
        pont,
    ) {
        this.id = id;
        this.leiras = leiras;
        this.feladatId = feladatId;
        this.fajlId = fajlId;
        this.pont = pont;
    }

    static fromObj(obj) {
        return new Alfeladat(
            obj.id,
            obj.Leiras,
            obj.FeladatId,
            obj.FajlId,
            obj.Pont,
        )
    }
}

class Intezmeny {
    constructor (
        id,
        intezmenyNev,
    ) {
        this.id = id;
        this.intezmenyNev = intezmenyNev;
    }

    static fromObj(obj) {
        return new Intezmeny(
            obj.id,
            obj.IntezmenyNev,
        )
    }
}

class FeladatCache {
    constructor () {
        this.feladatok = [];
        this.loadedRanges = [];
        //this.loaded = 0;
        this.limit = 10;
        this.page = 0;

        this.getPage();
    }

    getPage() {
        const start = this.page * this.limit;
        const end = start + this.limit;
        
        if (this.needsFetch(start, end)) {
            console.log("this.limit", this.limit, "start", start)
            let adat = ajax_post("/sendFeladatokFuckedUp", 1, { limit: this.limit, offset: start });
            console.log(adat);
            this.addFeladatok(adat.results);

            let obj = { start: start, end: end }
            if(!this.loadedRanges.includes(obj)) {
                this.loadedRanges.push(obj);
            }
            
            console.log("loadedRanges", this.loadedRanges)
        } 
    }

    needsFetch(start, end) {
        let fetch = true;

        this.loadedRanges.forEach(range => {
            if ((range.start <= start) && (range.end >= end)) {
                fetch = false;
            }
        })

        return fetch;
    }

    changeLimit(limit) {
        this.limit = limit;
        this.getPage(); 
    }

    addFeladatok(adatok) { 
        adatok.forEach(adat => { 
            let feladat = Feladat.fromObj(adat); 
            this.feladatok.push(feladat); 
        });         

        //this.loaded = this.feladatok.length; 
    }

    removeFeladat(feladat) {
        //this.feladatok.
    }

    setPage(p) { // start, -1, +1, end
        console.log(p);

        if (p == "start") {
            this.page = 0;
        } else if (p == "-1") {
            this.page -= 1;
        } else if (p == "+1") {
            this.page += 1;
        } else if (p == "end") {
            this.page = Math.floor(this.feladatok.length / this.limit) - 1;
        }

        this.render("BigDih", true);
    }

    render(id, reset) {
        let dest = document.getElementById(id);
        let start = this.page * this.limit;
        let end = start + this.limit;
        var html = [];

        if (reset) dest.innerHTML = "";

        for (let i = start; i < end; i++) {
            const feladat = this.feladatok[i];
            if (!feladat) {
                //throw new RangeError("FeladatCache render index out of range");
                break;
            }

            html.push(feladat.render());
            //console.log(html)
        }

        dest.innerHTML += html.join("");
    }
}