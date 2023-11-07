// mailer.js
const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: "mail.supersmartagents.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: "support@supersmartagents.com",
      pass: "4Sgr3;;I83SmrJ", // Replace with the email account's password
    },
  });

  const mailOptions = {
    from: '"SuperSmartAgents Support" <support@supersmartagents.com>',
    ...options,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
