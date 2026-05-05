const axios = require("axios");
const config = require("../config/config");

// const nodemailer = require("nodemailer");
// const dns = require("dns");
// const { decrypt } = require("../utils/crypto.utils");

// const smtpPort = parseInt(config.SMTP_PORT) || 465;
// const isSecure = smtpPort === 465;

// const defaultTransporter = nodemailer.createTransport({
//   host: config.SMTP_HOST,
//   port: smtpPort,
//   family: 4,
//   secure: isSecure,
//   auth: {
//     user: config.EMAIL_USER,
//     pass: config.EMAIL_PASS,
//   },
//   connectionTimeout: 10000,
//   greetingTimeout: 10000,
//   socketTimeout: 15000,
//   dnsLookup: (hostname, options, callback) => {
//     dns.lookup(hostname, { family: 4 }, callback);
//   },
//   tls: {
//     rejectUnauthorized: false,
//     minVersion: 'TLSv1.2'
//   },
// });

async function sendMail(to, subject, text, html, userEmailConfig = null) {
  try {
    // let transporter = defaultTransporter;
    let fromEmail = config.SUPPORT_EMAIL;

    // // Use user-specific SMTP if provided - DISCONNECTED AS PER REQUEST
    // if (userEmailConfig && userEmailConfig.SmtpHost && userEmailConfig.User && userEmailConfig.Pass) {
    //   const userPort = parseInt(userEmailConfig.SmtpPort) || 465;
    //   const userSecure = userPort === 465;

    //   transporter = nodemailer.createTransport({
    //     host: decrypt(userEmailConfig.SmtpHost),
    //     port: userPort,
    //     family: 4,
    //     secure: userSecure,
    //     auth: {
    //       user: decrypt(userEmailConfig.User),
    //       pass: decrypt(userEmailConfig.Pass),
    //     },
    //     connectionTimeout: 10000,
    //     greetingTimeout: 10000,
    //     socketTimeout: 15000,
    //     dnsLookup: (hostname, options, callback) => {
    //       dns.lookup(hostname, { family: 4 }, callback);
    //     },
    //     tls: {
    //       rejectUnauthorized: false,
    //       minVersion: 'TLSv1.2'
    //     },
    //   });
    //   fromEmail = decrypt(userEmailConfig.SupportEmail) || decrypt(userEmailConfig.User);
    // }

    // const info = await transporter.sendMail({
    //   from: fromEmail,
    //   to: to,
    //   subject: subject,
    //   text: text,
    //   html: html,
    // });

    // Implementation using Resend API
    const response = await axios.post(
      "https://api.resend.com/emails",
      {
        from: fromEmail,
        to: to,
        subject: subject,
        text: text,
        html: html,
      },
      {
        headers: {
          Authorization: `Bearer ${config.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Email sent via Resend:", response.data.id);
    return response.data;
  } catch (error) {
    console.error("Email send failed (Resend):", error.response?.data || error.message);
    throw error;
  }
}

module.exports = sendMail;
