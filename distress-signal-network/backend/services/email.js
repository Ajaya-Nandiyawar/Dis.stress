const nodemailer = require('nodemailer');

const sendEmailAlert = async (alertType, confidence) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const targetEmail = process.env.TARGET_EMAIL;

  if (!user || !pass || !targetEmail) {
    console.warn("Email credentials missing. Skipping Email broadcast.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  const mailOptions = {
    from: `"DIST.RESS Network" <${user}>`,
    to: targetEmail,
    subject: `🚨 EMERGENCY ALERT: ${(alertType || 'UNKNOWN').toUpperCase()} DETECTED 🚨`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid red; border-radius: 5px;">
        <h2 style="color: red;">🚨 DIST.RESS SYSTEM ALERT 🚨</h2>
        <p><b>Threat Type:</b> <span style="color: red;">${(alertType || 'UNKNOWN').toUpperCase()}</span></p>
        <p><b>Confidence Score:</b> ${Math.round((confidence || 0) * 100)}%</p>
        <p><b>Action Required:</b> Please evacuate the affected area immediately and follow local authority instructions.</p>
        <hr/>
        <p style="font-size: 12px; color: #666;">This is an automated message from the DIST.RESS Signal Network.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email broadcast sent successfully! Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`Failed to send Email broadcast:`, error.message);
  }
};

module.exports = { sendEmailAlert };
