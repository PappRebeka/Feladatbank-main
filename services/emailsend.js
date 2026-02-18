const conn = require("../config/db").connMegszerez();
const { createClientUsingCredentials, baseUrl, SCOPES } = require("../config/google");
const { google } = require("googleapis");

async function sendMail(to, type = 'request', data = {}) { // RD, PR
  const senderEmail = 'sz7.cloudconsole@gmail.com'; // mindig innen küldjük az emailt
  SCOPES.push("https://www.googleapis.com/auth/gmail.send");

  const sql = `SELECT AccessToken, RefreshToken, AccessEletTartam FROM Users WHERE Email = ? LIMIT 1`;
  conn.query(sql, [senderEmail], async (err, results) => {
    if (err || !results || results.length === 0) {
      console.error('(sendMail) cannot load sender tokens', err);
      return;
    }

    const accessToken = results[0]["AccessToken"]
    const refreshToken = results[0]["RefreshToken"]
    const accesseletTartam = results[0]["AccessEletTartam"]


  if (!refreshToken) {
    console.error('(sendMail) no refresh token for sender — re-auth required for', senderEmail);
    return;
  }
  try {
    //admin kliens
    const client = createClientUsingCredentials(accessToken, refreshToken, accesseletTartam);
    
    let subject = '';

    switch (type){
      case 'request':
        subject = "Új jelszó igénylése" 
        break;
      case 'report':
        subject = "Hiba sikeresen javítva"
        break;
      default:
        subject = "Sikeres jelszófrissítés"
        break;
    }
    const gmail = google.gmail({ version: 'v1', auth: client });

    const rawMessage = makeMail(to, senderEmail, subject, type, data);

    const res = await gmail.users.messages.send({
      userId: senderEmail, // "me" = authenticated user
      requestBody: {
        raw: rawMessage,
      },
    });
    
    SCOPES.slice(0, SCOPES.length - 1);
  } catch(err) {
    return;
  }
  })
}

function newPasswordRequestEmail(adress){
  return `<html>
            <body style="font-family: Arial, sans-serif; background-color: #e0e5ec; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; padding: 32px; border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
                
                <h2 style="color: #222; margin: 0 0 14px 0;">
                  Jelszó visszaállítása
                </h2>
                
                <p style="color: #333; line-height: 1.6; margin: 0 0 18px 0;">
                  Rendszerünk jelszó-visszaállítási kérelmet fogadott az Ön fiókjához.
                  A jelszó megváltoztatásához kérjük, kattintson az alábbi gombra:
                </p>

                <div style="text-align: center; margin: 24px 0 20px 0;">
                  <a href="${baseUrl}/passreset.html?email=${encodeURIComponent(adress)}"
                    style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #6a63f4; text-decoration: none; border-radius: 10px;">
                    Jelszó visszaállítása
                  </a>
                </div>

                <p style="color: #333; line-height: 1.6; margin: 0 0 10px 0;">
                  Amennyiben Ön nem kezdeményezte a jelszó visszaállítását, kérjük, hagyja figyelmen kívül ezt az üzenetet.
                </p>

                <p style="font-size: 12px; color: #777; margin: 0;">
                  A hivatkozás a kiküldéstől számított 1 órán belül érvényes.
                </p>

                <p style="font-size: 12px; color: #777; margin: 18px 0 0 0;">
                  Ez egy automatikusan generált üzenet, kérjük, ne válaszoljon rá.
                </p>
              </div>
            </body>
          </html>`
}

function newPasswordFeedbackEmail(){
return `<html>
            <body style="font-family: Arial, sans-serif; background-color: #e0e5ec; margin: 0; padding: 0;">
              <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; padding: 32px; border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
                
                <h2 style="color: #222; margin: 0 0 14px 0;">
                  Jelszó megváltoztatva
                </h2>
                
                <p style="color: #333; line-height: 1.6; margin: 0 0 18px 0;">
                  Ezzel az üzenettel megerősítjük, hogy a Feladatbank jelszava sikeresen megváltozott
                </p>

                <p style="font-size: 12px; color: #777; margin: 18px 0 0 0;">
                  Ez egy automatikusan generált üzenet, kérjük, ne válaszoljon rá.
                </p>
              </div>
            </body>
          </html>`
}

function newReportFixedEmail(reportId, userName, reportTime, reportMessage) {
  return `<html>
          <body style="font-family: Arial, sans-serif; background-color: #e0e5ec; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; padding: 32px; border-radius: 14px; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
              <h2 style="color: #222; margin: 0 0 14px 0;">
                #${reportId} hibajelentés - Feladatbank
              </h2>

              <h3 style="color: #222; margin: 0 0 14px 0;">
                Kedves ${userName}!
              </h2>
              <p style="color: #333; line-height: 1.6; margin: 0 0 18px 0;">
                Ezzel az üzenettel szeretném értesíteni arról, hogy a #${reportId} hibajelentés sikeresen javítva lett.
              </p>

              <div style="width: 100%; margin: 10px 5px; background-color: #222; padding: 16px; border-radius: 14px; margin: 16px ">
                <h3 style="color: #fff">#${reportId} - ${reportTime}</h3>
                <p style="color: #fff">
                  ${reportMessage}
                </p>
              </div>

              <p style="font-size: 12px; color: #777; margin: 18px 0 0 0;">
                Ez egy automatikusan generált üzenet, kérjük, ne válaszoljon rá.
              </p>
            </div>
          </body>
        </html>`
}

function makeMail(to, from, subject, type, data = {}) {//PR
  // RFC 2047 encoding for UTF-8 characters in email headers
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

  let body = '';
  switch (type){
    case 'request':
      body = newPasswordRequestEmail(to) 
      break;
    case 'report':
      body = newReportFixedEmail(data.id, data.Nev, data.Ido, data.Message)
      break;
    default:
      body = newPasswordFeedbackEmail()
      break;
  }
  
  const emailLines = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${encodedSubject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    body,
  ];

  const email = emailLines.join("\n");
  // Base64url encode with explicit UTF-8 handling
  return Buffer.from(email, 'utf-8')
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

module.exports = { sendMail }

