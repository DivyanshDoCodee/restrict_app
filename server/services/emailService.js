const nodemailer = require("nodemailer");

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

const transporter = nodemailer.createTransport({
  ...SMTP_CONFIG,
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 5 * 60 * 1000,
  greetingTimeout: 5 * 60 * 1000,
  socketTimeout: 5 * 60 * 1000
});

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: SMTP_CONFIG.auth.user,
      to,
      subject,
      ...(text && { text }),
      ...(html && { html })
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = {
  sendEmail
};