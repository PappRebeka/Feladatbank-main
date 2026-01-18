module.exports = function (oauth2Client, logger, google) {
    const express = require("express");
    const router = express.Router();

    const { connMegszerez } = require("./config/db");
    const { classroomGetCourses } = require("./utils/helpers");

    const conn = connMegszerez();

    var classroom;
    var drive

    async function classroomGetCourses(userid){ //Nem ez miatt hal meg ha nincs kurzus
        results = await getUserDataFromSessionId(userid)
        AccessToken= results["AccessToken"],
        RefreshToken= results["RefreshToken"], 
        AccessEletTartam= new Date(results["AccessEletTartam"]).getTime()
        const user = {
            id: userid,
            AccessToken: AccessToken,
            RefreshToken: RefreshToken,
            AccessEletTartam: AccessEletTartam
        }
        AccessToken, AccessEletTartam = await refreshAccessTokenIfNeeded(user)
        const client = createClientUsingCredentials(AccessToken, RefreshToken, AccessEletTartam)
    
        /*console.log("token present?", !!access_token, "exp(ms):", expiry_date)
        const oauth2 = google.oauth2({ version: 'v2', auth: client })
        const me = await oauth2.userinfo.get()
        console.log("acting as:", me.data.email)*/
    
        classroom = await google.classroom({ version:"v1", auth: client})
        drive = await google.drive({ version: 'v3', auth: client }); // create authenticated drive client
        const courses = await classroom.courses.list({ teacherId: "me", pageSize: 5 })
        return courses.data.courses
    }

    router.get("/courses", async (req, res) => {
        var userid = req.session.userId
        try {
            const courses = await classroomGetCourses(userid);
            logger.log({
                level: 'debug',
                message: `/sendClassroomCourses van kliens courses=`
            });
          
            logger.log({ level: 'debug', message: courses})
            const idk = []
            const nevek = []
            const hasznalhatok = courses.filter(a => a.courseState != 'ARCHIVED')
            if(hasznalhatok.length > 0) {
                for (const alma of hasznalhatok) {
                    logger.log({
                        level: 'debug',
                        message: `/sendClassroomCourses kurzus neve: ${alma.name}, kurzus id: ${alma.id} userid=${userid}`
                    });
                    nevek.push(alma.name)
                    idk.push(alma.id)
                }
                res.set('Content-Type', 'application/json', 'charset=utf-8');
                res.send(JSON.stringify({ "nevek":nevek, "idk":idk } ))
            } 
            else {
                logger.log({
                    level: 'debug',
                    message: `/sendClassroomCourses nincs használható kurzus userid=${userid}`
                });
                res.send(JSON.stringify({  }));
            }

            logger.log({
                level: 'debug',
                message: `/sendClassroomCourses vége userid=${userid}`
            });
            res.end();
        }
        catch (e) {
            logger.log({
                level: 'error',
                message: `/sendClassroomCourses hiba e=${e.message} userid=${userid}`
            });
        }
    });

    router.post("/tasks/publish", (req, res) => {
        const feladatId = req.query.feladatid
        const kurzusNev = req.query.kurzusNev
        const kurzusId = req.query.kurzusId
        const kurzusFeladatId = req.query.kurzusFeladatId
        var sql = `INSERT INTO Kozzetett (FeladatId, kurzusNev, kurzusId, kurzusFeladatId) VALUES(?, ?, ?, ?)`
        conn.query(sql, [feladatId, kurzusNev, kurzusId, kurzusFeladatId], (err, results) => {
            if (err) { 
                logger.log({
                    level: 'error',
                    message: `(/saveClassroomFeladatKozzetett) error=${err.message}`
                });
            
                throw err;  
            }
            res.end()
        });
    });

    router.post("/tasks", async (req, res) => {
        let kurzusId = req.query.kurzusid
        let feladatId = req.query.feladatid
        let dueDate = req.query.dueDate
        let dueTime = req.query.dueTime
        let sql = `SELECT Feladatok.Nev, Feladatok.Leiras AS feladatLeiras, Feladatok.Tema, Feladatok.Nehezseg, 
                    (SELECT sum(Pont) FROM Alfeladat WHERE FeladatId = ${feladatId}) AS maxPont, 
                    Alfeladat.id, Alfeladat.Leiras, Alfeladat.Pont, Alfeladat.FajlId
                  FROM Feladatok left JOIN Alfeladat ON Feladatok.id = Alfeladat.FeladatId 
                  WHERE Feladatok.id = ${feladatId}`; // AHGYUGIUFASZ
        conn.query(sql, async (err, results) => {
            if (err){
                logger.log({
                    level: 'error',
                    message: `(/postClassroomFeladat) error=${err.message}`
                });
                throw err;
            }
      
            logger.log({
                level: 'debug',
                message: `(/postClassroomFeladat) results=`
            })
      
            logger.log({ level: 'debug', message: results})
      
            var nev = results[0]["Nev"];
            var feladatLeiras = results[0]["feladatLeiras"];
            var tema = results[0]["Tema"];
            var nehezseg = results[0]["Nehezseg"];
            var title = `${tema} - ${nev}`;
            var description = `nehézség: ${nehezseg}/10\nLeírás: ${feladatLeiras}\n`
            var year =    dueDate == '' ? null : dueDate.split("-")[0];
            var month =   dueDate == '' ? null : dueDate.split("-")[1];
            var day =     dueDate == '' ? null : dueDate.split("-")[2];
            var hours =   dueTime == '' ? null : parseInt(dueTime.split(":")[0]) - 1; //időzóna bullshit
            var minutes = dueTime == '' ? null : dueTime.split(":")[1];
            var maxPont = results[0]["maxPont"]

            let fajlIds = []
      
            for (let i = 0; i < results.length; i++) {
                var leiras = results[i]["Leiras"];
                var pont = results[i]["Pont"];
                if (results[i]["FajlId"]){
                    var id = await fajlFeltoltClassroom(results[i]["FajlId"])
                    fajlIds.push(id);
                }
                if(pont != null && leiras != null)
                    description += `${i+1}. alfeladat - ${pont} pont\n${leiras}\n\n`
            }
      
            var lofasz = await createClassroomTask(title, description, maxPont, year, month, day, hours, minutes, kurzusId, fajlIds)
            res.send(JSON.stringify({ "courseWorkId":lofasz } ))
            res.end();
        });
    }),

    router.delete("/tasks/:id", (req, res) => {
        const kurzusId = req.params.id
        const kurzusFeladatId = req.query.kurzusFeladatId

        await classroom.courses.courseWork.delete({
            courseId: kurzusId,
            id: kurzusFeladatId
        });
    
        let sql = `DELETE FROM Kozzetett WHERE kurzusFeladatId = ${kurzusFeladatId}`
        conn.query(sql, (err, results) => {
            if (err){
                logger.log({
                    level: 'error',
                    message: `(/removeClassroomFeladat) error=${err.message}`
                });
                throw err;
            }
            res.end()
        })
    });

    return router;
};