import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!process.env.SMTP_USER) {
    console.log('Email not configured, skipping...');
    return;
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'tournament@oneesports.com',
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

/**
 * Send room ID and passcode to all team leaders in a group.
 */
export async function sendRoomCredentials(
  emails: string[],
  roomID: string,
  passcode: string,
  matchTime: string,
  map: string
) {
  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Tournament Room Details</h2>
      <p>Match Time: <strong>${matchTime}</strong></p>
      <p>Map: <strong>${map}</strong></p>
      <hr/>
      <p><strong>Room ID:</strong> ${roomID}</p>
      <p><strong>Passcode:</strong> ${passcode}</p>
    </div>
  `;

  const recipients = emails.join(',');
  await sendEmail({
    to: recipients,
    subject: `Tournament Room ID - ${matchTime}`,
    html,
  });
}
