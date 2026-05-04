const nodemailer = require("nodemailer");
const config = require("../config/config");
const { decrypt } = require("../utils/crypto.utils");

const defaultTransporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  family: 4,
  secure: true,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
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
        port: userEmailConfig.SmtpPort || 465,
        family: 4,
        secure: true,
        auth: {
          user: decrypt(userEmailConfig.User),
          pass: decrypt(userEmailConfig.Pass),
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
