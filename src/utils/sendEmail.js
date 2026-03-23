const nodemailer = require("nodemailer");

// Create a transporter using Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const run = async (toAddress, subject, body) => {
  try {
    const info = await transporter.sendMail({
      from: `"ConnectNeighbour" <${process.env.SMTP_FROM_EMAIL || "hello@connectneighbour.in"}>`,
      to: toAddress,
      subject: subject,
      html: body, // This passes the beautiful HTML template from your router
      text: "Welcome to ConnectNeighbour! Please view this email in an HTML compatible client.",
    });

    return info;
  } catch (caught) {
    console.error("❌ Error sending email via Nodemailer:", caught);
    throw caught;
  }
};

module.exports = { run };
