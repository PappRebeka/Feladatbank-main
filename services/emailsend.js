const conn = require("../config/db").connMegszerez();
const { createClientUsingCredentials, baseUrl, SCOPES } = require("../config/google");
const { google } = require("googleapis");

async function sendMail(to) { // RD, PR
  const senderEmail = 'sz7.cloudconsole@gmail.com'; // mindig innen küldjük a visszaállító emailt
  SCOPES.push("https://www.googleapis.com/auth/gmail.send");

  const sql = `SELECT AccessToken, RefreshToken, AccessEletTartam FROM Users WHERE Email = ? LIMIT 1`;
  conn.query(sql, [senderEmail], async (err, results) => {
    if (err || !results || results.length === 0) {
      console.error('(sendMail) cannot load sender tokens', err);
      return;
    }

    //console.log("(/sendMail) results: ");
    //console.log(results)
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
    
    
    const subject = "Új jelszó igénylése"
    const gmail = google.gmail({ version: 'v1', auth: client });

    const rawMessage = makeMail(to, senderEmail, subject);
    
    const res = await gmail.users.messages.send({
      userId: senderEmail, // "me" = authenticated user
      requestBody: {
        raw: rawMessage,
      },
    });
    //console.log("Email sent to "+to)

    SCOPES.slice(0, SCOPES.length - 1); //tsundere gmail.send scope after sending email
    }
  catch(err){
    //console.log("mailsend error")
    //console.log(err)
  }
  })
}

function makeMail(to, from, subject) {//PR
  // RFC 2047 encoding for UTF-8 characters in email headers
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
  
  const emailLines = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${encodedSubject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    `<html>
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
          <a href="${baseUrl}/passreset.html?email=${encodeURIComponent(to)}"
             style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; background-color: #6c63ff; text-decoration: none; border-radius: 10px;">
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
  </html>`,
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

