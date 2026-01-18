![Logo](https://github.com/BadoBenike/feladatbank_branding/blob/main/LogoDarkSlim.png?raw=true "Logo")

# Felhasználói Specifikáció

## Tartalomjegyzék
- [Bevezetés](#bevezetés)
- [Felhasználói szerepek](#felhasználói-szerepek)
- [Integrációk](#integrációk)
- [Függőségek](#függőségek)

## Bevezetés
- A Feladatbank egy **központi feladattár**, amely segítségével előre elkészített feladatokat tud **pár kattintással** közzétenni a tanulóival.
- Ez segít a tanórák elején a repetatív feladatközlést megelőzni, így **több időt** hagyva a tanításhoz.

## Felhasználói szerepek
- **Tanár:**
    - Feladatok készítése
    - Feladatok publikálása
    - Feladatok törlése, archiválása
- **Admin:**
    - Felhasználók megtekintése
    - Napló megtekintése, elemzése

## Integrációk
1. Google Classroom API
2. Google Drive API
3. Google OAuth2 API

## Függőségek
- változni fog
- `express` - web applikációs keretrendszer
- `googleapis` - könyvtár a google api-k használatához
- `mysql` - a web applikáció adatbázisa
- `mime-types` - mime típusok dekódolásához
- `node-cron` - automatikus biztonsági mentés időzítése
- `crypto` - véletlenszerű userToken-ek generálásához
- `fs` - fájlok felolvasásához feltöltésnél
- `path` - elérési utak hatékony kezeléséhez
- `child_process` - biztonsági mentés létrehozása
- `util` - Promise-alapú adatbázis csatlakozáshoz
- `ansi-to-html` - terminál ansi kódok html-re konvertálása
- `multer` - fájl hatékony és gyors feltöltéséhez
- `js-md5` - jelszavak gyors titkosításához
- `dotenv` - környezeti konstans értékek használata
- `express-session` - sessionok kezelése szerveroldalon
- `winston` - naplózás a konzolba és az admin felületbe
