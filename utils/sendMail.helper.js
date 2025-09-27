const Mailjet = require("node-mailjet")
const dotenv = require('dotenv');
dotenv.config();

const MAILJET_API_KEY_PUBLIC = process.env.MAILJET_API_KEY_PUBLIC;
const MAILJET_API_KEY_PRIVATE = process.env.MAILJET_API_KEY_PRIVATE;
// console.log("MAILJET_API_KEY_PUBLIC,MAILJET_API_KEY_PRIVATE",MAILJET_API_KEY_PUBLIC,MAILJET_API_KEY_PRIVATE)
// const Email = process.env.MAILJET_ADMIN_EMAIL;
const Email = "mail.nanduapp@gmail.com";
const Name = process.env.MAILJET_APPNAME;



const mailjet = Mailjet.apiConnect(MAILJET_API_KEY_PUBLIC, MAILJET_API_KEY_PRIVATE)

exports.sendMail = async ({ email, name, subject, html, bccEmail = null, bccName = null }) => {
    try {
        const request = await mailjet.post("send", { version: "v3.1" }).request({
            Messages: [
                {
                    From: { Email, Name },
                    To: [{ Email: email, Name: name }],
                    Bcc: bccEmail && bccName ? [{ Email: bccEmail, Name: bccName }] : [],
                    Subject: subject,
                    TextPart: "",
                    HTMLPart: html,
                },
            ],
        });
        return { msg: "Email sent", status: true, data: request };
    } catch (e) {
        console.log(e.message);
        return { msg: e, status: false };
    }
};


