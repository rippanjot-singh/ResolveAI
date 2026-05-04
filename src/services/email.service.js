const nodemailer = require("nodemailer");
const dns = require("dns");
const config = require("../config/config");
const { decrypt } = require("../utils/crypto.utils");

const defaultTransporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: parseInt(config.SMTP_PORT) || 465,
  family: 4,
  secure: true,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,
  dnsLookup: (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4 }, callback);
  },
  tls: {
    rejectUnauthorized: false, // Helps with some cloud hosting certificate issues
  },
});

async function sendMail(to, subject, text, html, userEmailConfig = null) {
  try {
    let transporter = defaultTransporter;
    let fromEmail = config.SUPPORT_EMAIL;

    // Use user-specific SMTP if provided
    if (userEmailConfig && userEmailConfig.SmtpHost && userEmailConfig.User && userEmailConfig.Pass) {
      transporter = nodemailer.createTransport({
        host: decrypt(userEmailConfig.SmtpHost),
        port: parseInt(userEmailConfig.SmtpPort) || 465,
        family: 4,
        secure: true,
        auth: {
          user: decrypt(userEmailConfig.User),
          pass: decrypt(userEmailConfig.Pass),
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        dnsLookup: (hostname, options, callback) => {
          dns.lookup(hostname, { family: 4 }, callback);
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      fromEmail = decrypt(userEmailConfig.SupportEmail) || decrypt(userEmailConfig.User);
    }

    const info = await transporter.sendMail({
      from: fromEmail,
      to: to,
      subject: subject,
      text: text,
      html: html,
    });

    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email send failed:", error);
    throw error;
  }
}

module.exports = sendMail;
