const conn = require("./config/db").connMegszerez();

class BaseMapper {
    constructor(conn) {
        this.conn = conn;
        this.tableName = null;
    }

    async create(object) {}
    async read() {}
    async update(object) {}
    async delete(object) {}
}

class BaseObject {
    constructor(tableName, data = {}) {
        this._tableName = tableName;
        Object.assign(this, data);
    }

    get tableName() {
        return this._tableName;
    }
}

//#region User

class User extends BaseObject {
    constructor(data = {}) {
        super("Users", data);
    }
}

class UserMapper extends BaseMapper {
    constructor(conn) {
        super(conn);
        this.tableName = "Users";
    }

    async create(object) {
        this.conn.query(
            `INSERT INTO ${this.tableName}
            (id, Nev, Email, Jelszo, Jogosultsag, AccessToken, RefreshToken, UserToken, AccessEletTartam, HatterSzin, IntezmenyId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [object.id, 
             object.Nev,
             object.Email,
             object.Jelszo,
             object.Jogosultsag,
             object.AccessToken,
             object.RefreshToken,
             object.UserToken,
             object.AccessEletTartam,
             object.HatterSzin,
             object.IntezmenyId],
            (err, results) => {
                if (err) {
                    console.error(`Error inserting into ${this.tableName}:`, err);
                } else {
                    console.log(`Inserted into ${this.tableName} with ID:`, results.insertId);
                }
            }
        )
    }

    async read() {
        try {
            const [rows] = await this.conn.query(
                `SELECT * FROM ${this.tableName}`
            );

            return rows.map(row => new User(row));
        } catch (err) {
            console.error(`Error reading from ${this.tableName}:`, err);
            return [];
        }
    }

    async update(object) {

    }

    async delete(object) {

    }
}

//#endregion

//#region Feladat

class Feladat extends BaseObject {
    constructor(data = {}) {
        super("Feladatok", data);
    }
}

class FeladatMapper extends BaseMapper {
    constructor(conn) {
        super(conn);
        this.tableName = "Feladatok";
    }

    async create(object) {
        this.conn.query(
            `INSERT INTO ${this.tableName}
            (id, Nev, Leiras, Evfolyam, Tantargy, Tema, Nehezseg, Tanar, Archivalva)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [object.id, 
             object.Nev,
             object.Leiras, 
             object.Evfolyam, 
             object.Tantargy, 
             object.Tema, 
             object.Nehezseg, 
             object.Tanar, 
             object.Archivalva],
            (err, results) => {
                if (err) {
                    console.error(`Error inserting into ${this.tableName}:`, err);
                } else {
                    console.log(`Inserted into ${this.tableName} with ID:`, results.insertId);
                }
            }
        )
    }

    async read() {
        try {
            const [rows] = await this.conn.query(
                `SELECT * FROM ${this.tableName}`
            );

            return rows.map(row => new Feladat(row));
        } catch (err) {
            console.error(`Error reading from ${this.tableName}:`, err);
            return [];
        }
    }

    async update(object) {
        this.conn.query(
            `UPDATE ${this.tableName}
            SET Nev = ?, Leiras = ?, Evfolyam = ?, Tantargy = ?, Tema = ?, Nehezseg = ?, Tanar = ?, Archivalva = ?
            WHERE id = ?`,
            [object.Nev,
             object.Leiras,
             object.Evfolyam,
             object.Tantargy,
             object.Tema,
             object.Nehezseg,
             object.Tanar,
             object.Archivalva,
             object.id
            ],
            (err, results) => {
                if (err) {
                    console.error(`Error updating ${this.tableName}:`, err);
                } else {
                    console.log(`Updated ${this.tableName} with ID:`, results.insertId);
                }
            }
        )
    }

    async delete(object) {

    }
}

//#endregion

//#region Alfeladat

class Alfeladat extends BaseObject {
    constructor(data = {}) {
        super("Alfeladat", data);
    }
}

class AlfeladatMapper extends BaseMapper {
    constructor(conn) {
        super(conn);
        this.tableName = "Alfeladat";
    }

    async create(object) {
        this.conn.query(
            `INSERT INTO ${this.tableName}
            (id, Leiras, FeladatId, FajlId, Pont)
            VALUES (?, ?, ?, ?, ?)`,
            [object.id,
            object.Leiras,
            object.FeladatId,
            object.FajlId,
            object.Pont], // array
            (err, results) => {
                if (err) {
                    console.error(`Error inserting into ${this.tableName}:`, err);
                } else {
                    console.log(`Inserted into ${this.tableName} with ID:`, results.insertId);
                }
            }
        )
    }

    async read() {
        try {
            const [rows] = await this.conn.query(
                `SELECT * FROM ${this.tableName}`
            );

            return rows.map(row => new Alfeladat(row));
        } catch (err) {
            console.error(`Error reading from ${this.tableName}:`, err);
            return [];
        }
    }

    async update(object) {
        this.conn.query(
            `UPDATE ${this.tableName}
            SET Leiras = ?, FeladatId = ?, FajlId = ?, Pont = ?
            WHERE id = ?`,
            [object.Leiras,
             object.FeladatId,
             object.FajlId,
             object.Pont,
             object.id
            ],
            (err, results) => {
                if (err) {
                    console.error(`Error updating ${this.tableName}:`, err);
                } else {
                    console.log(`Updated ${this.tableName} with ID:`, results.insertId);
                }
            }
        )
    }

    async delete(object) {

    }
}

//#endregion

//#region Intezmeny

class Intezmeny extends BaseObject {
    constructor(data = {}) {
        super("Intezmenyek", data);
    }
}

class IntezmenyMapper extends BaseMapper {
    constructor(conn) {
        super(conn);
        this.tableName = "Intezmenyek";
    }

    async create(object) {
        this.conn.query(
            `INSERT INTO ${this.tableName}
            (id, IntezmenyNev)
            VALUES (?, ?)`,
            [object.id,
            object.IntezmenyNev], // array
            (err, results) => {
                if (err) {
                    console.error(`Error inserting into ${this.tableName}:`, err);
                } else {
                    console.log(`Inserted into ${this.tableName} with ID:`, results.insertId);
                }
            }
        )
    }

    async read() {
        try {
            const [rows] = await this.conn.query(
                `SELECT * FROM ${this.tableName}`
            );

            return rows.map(row => new Intezmeny(row));
        } catch (err) {
            console.error(`Error reading from ${this.tableName}:`, err);
            return [];
        }
    }

    async update(object) {

    }

    async delete(object) {

    }
}

//#endregion

//#region Kozzetett

class Kozzetett extends BaseObject {
    constructor(data = {}) {
        super("Kozzetett", data);
    }
}

class KozzetettMapper extends BaseMapper {
    constructor(conn) {
        super(conn);
        this.tableName = "Kozzetett";
    }

    async create(object) {
        this.conn.query(
            `INSERT INTO ${this.tableName}
            (id, FeladatId, Tanar, kurzusNev, kurzusId, kurzusFeladatId)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [object.id,
            object.FeladatId,
            object.Tanar,
            object.kurzusNev,
            object.kurzusId,
            object.kurzusFeladatId], // array
            (err, results) => {
                if (err) {
                    console.error(`Error inserting into ${this.tableName}:`, err);
                } else {
                    console.log(`Inserted into ${this.tableName} with ID:`, results.insertId);
                }
            }
        )
    }

    async read() {
        try {
            const [rows] = await this.conn.query(
                `SELECT * FROM ${this.tableName}`
            );

            return rows.map(row => new Kozzetett(row));
        } catch (err) {
            console.error(`Error reading from ${this.tableName}:`, err);
            return [];
        }
    }

    async update(object) {

    }

    async delete(object) {

    }
}

//#endregion

//#region Megosztott

class Megosztott extends BaseObject {
    constructor(data = {}) {
        super("Megosztott", data);
    }
}

class MegosztottMapper extends BaseMapper {
    constructor(conn) {
        super(conn);
        this.tableName = "Megosztott";
    }

    async create(object) {
        this.conn.query(
            `INSERT INTO ${this.tableName}
            (id, FeladatId, FeladoId, VevoId)
            VALUES (?, ?, ?, ?)`,
            [object.id,
            object.FeladatId,
            object.FeladoId,
            object.VevoId], // array
            (err, results) => {
                if (err) {
                    console.error(`Error inserting into ${this.tableName}:`, err);
                } else {
                    console.log(`Inserted into ${this.tableName} with ID:`, results.insertId);
                }
            }
        )
    }

    async read() {
        try {
            const [rows] = await this.conn.query(
                `SELECT * FROM ${this.tableName}`
            );

            return rows.map(row => new Megosztott(row));
        } catch (err) {
            console.error(`Error reading from ${this.tableName}:`, err);
            return [];
        }
    }

    async update(object) {

    }

    async delete(object) {

    }
}

//#endregion

module.exports = {
    User,
    UserMapper,
    Feladat,
    FeladatMapper,
    Alfeladat,
    AlfeladatMapper,
    Intezmeny,
    IntezmenyMapper,
    Kozzetett,
    KozzetettMapper,
    Megosztott,
    MegosztottMapper
};
