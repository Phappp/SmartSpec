import nodemailer, { Transporter } from "nodemailer";
import "dotenv/config";

const transporter: Transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false, // đúng cho 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// The mailService with sendEmail function
interface EmailOptions {
  emailFrom: string;
  emailTo: string;
  emailSubject: string;
  emailText: string;
}

const mailService = {
  async sendEmail({
    emailFrom,
    emailTo,
    emailSubject,
    emailText,
  }: EmailOptions): Promise<boolean | null> {
    const mailOptions = {
      from: emailFrom,
      to: emailTo,
      subject: emailSubject,
      html: emailText, // key phải là html chứ không phải text để gửi các thẻ html
    };

    await transporter.sendMail(mailOptions);
    return true;
  },

};

export default mailService;