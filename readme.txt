A web applikáció indítása nulláról:
    0. Korrekt verziók használata (Linux útmutató):
        Javasoljuk a következő csomagok korrekt verziójának használatát:
            0. `nvm` (Node Version Manager):
                A Node csomagok verziójának letöltéséhez az `nvm` csomagot javasoljuk.
                Kérem hogy kövesse a letöltési és telepítése utasításokat az `nvm`
                Github repository-ján: https://github.com/nvm-sh/nvm
            1. Node:
                `nvm install 20` - Node 20 LTS verziójának letöltése
                `nvm use 20` - Ennek a verziójának használata
            2. MariaDB:
                A MariaDB helyes verziójának letöltése érdekében látogasson el erre a weboldalra:
                    - https://mariadb.org/download/
                1. Válassza ki a helyes operációs rendszert és utasításkészlet-architektúra verziót.
                2. Hogy a 10.11.13-as verziót letöltse, kapcsolja be a "Display older releases" kapcsolót.
                3. Válassza ki a korrekt verziót és nyomjon rá a "Download" gombra.
            3. `mysqldump` (adatbázis biztonsági mentés):
                
                
    1. A github repo klónozása helyileg: 
        `git clone https://github.com/PappRebeka/Feladatbank-main.git`
    2. A klónozott mappa megnyitása:
        `cd Feladatbank-main`
    3. A függőségek letöltése:
        `npm ci`
    4. A megfelelő adatok kitöltése:
        1. a Google Oauth applikáció szerkesztése (FONTOS!!!) 
            Mivel a web applikáció költöztetve van, és emiatt megváltozik
            maga az applikáció url-je, ezt az Oauth Cloud Console-ban is
            frissíteni kell a redirect URI-t, hogy helyesen működjön az
            Oauth2 bejelentkezés. A redirect URI-t úgy kell megadni, hogy
            az ezt a sémát alkossa: 
                `http://base_url_ide/reg`
                PL. `http://localhost:9071/reg`
            Pár megjegyzés:
                - Az alap URL után lehet rakni portot, szükség esetén.
                - MINDIG rakja a /reg végpontot az URL után.
                - Az Cloud Console adatok frissítése után valószínűsíthető,
                  hogy egy pár percig tart az, hogy az adatok rendesen, 
                  rendszer-szinten frissűljenek.

        2. server-config.json használata (FONTOS!!!)
            "server": 
                "port" => a szerver használni való port-ja
                "base_url" => a szerver alap url-je (google oauth miatt)
                "session_secret" => a session-höz használni kívánt kód

            "database": 
                "host" => a MySql szerver címe
                "port" => a MySql szerver portja
                "user" => a MySql-hez használni való felhasználónév
                "password" => a MySql felhasználónévhez kapcsolódó jelszó
                "name" => a MySql adatbázis neve
                "connectionLimit" => csatlahoztatható sql driver-ek száma (10)
                "waitForConnections" => true, nehogy timeout-oljon a driver

            "google":
                "client_id": a google oauth applikáció kliens id-je
                "client_secret": a google oauth applikáció titok kódja
            
    5. A web applikáció futtatása:
        `npm start-nohup`
    6. A web applikáció megállítása:
        `npm stop-nohup`