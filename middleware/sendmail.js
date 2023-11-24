const nodemailer = require("nodemailer");

const sendEmail = async (req, res, next) => {
  try {
    const recipientEmail = req.recipientEmail;
    const firstName = req.firstName; // Use this as the password
    // Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: "mail.supersmartagents.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: "billing@supersmartagents.com",
        pass: "4Sgr3;;I83SmrJ", // Replace with the email account's password
      },
    });

    // Send the email
    await transporter.sendMail({
      from: '"Super Smart Agents" <billing@supersmartagents.com>',
      to: req.recipientEmail, // Use the recipient's email address from the req object
      subject: "Payment Successfully Processed",
      text: "Thank you for your payment at Super Smart Agents. Please allow 2-3 days for the bot setup. In the meantime, you can explore our wiki to learn more about our services.",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4;">
          <h2 style="color: #333; border-bottom: 1px solid #e4e4e4; padding-bottom: 10px;">Payment Confirmation</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Thank you for your payment at <strong>Super Smart Agents</strong>. Your payment has been successfully processed.
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Please allow 2-3 days for the bot setup. We will notify you via email once everything is ready.
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
          In the meantime, we invite you to delve deeper into the world of Super Smart Agents. Our <a href="https://wiki.supersmartagents.com/" style="color: #007BFF; text-decoration: none;">wiki</a> is a treasure trove of information, insights, and best practices tailored for our valued clients like you. Dive in and empower yourself with knowledge!
        </p> 
        <p style="font-size: 16px; line-height: 1.5; color: #555;">
            If you wish to access your dashboard, please visit <a href="https://dashboard.supersmartagents.com/" style="color: #007BFF; text-decoration: none;">Super Smart Agents Dashboard</a>. Your login credentials are as follows:
            <br>Email: ${recipientEmail}
            <br>Password: ${firstName} (Your first name)
          </p>       
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Warm regards,<br>
            The Super Smart Agents Team
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    next(error); // Pass the error to the next middleware or error handler
  }
};

module.exports = sendEmail;
