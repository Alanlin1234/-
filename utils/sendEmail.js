const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 创建邮件传输对象
    const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    // 邮件选项
    const mailOptions = {
        from: `${process.env.SMTP_USER}`,
        to: options.email,
        subject: options.subject,
        html: options.message
    };

    // 发送邮件
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail; 