// emailConfig.js

const nodemailer = require('nodemailer');
require('dotenv').config();  

// Créez un transporteur de mails avec votre fournisseur SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,  
  port: process.env.EMAIL_PORT,  
  auth: {
    user: process.env.EMAIL_USER,  
    pass: process.env.EMAIL_PASS  
  }
});

// Fonction pour envoyer un e-mail
const sendEmailNotification = (recipientEmail, subject, message) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,  
    to: recipientEmail,  
    subject: subject,  
    text: message   
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Erreur d\'envoi de l\'email :', error);
    } else {
      console.log('Email envoyé : ' + info.response);
    }
  });
};

module.exports = { sendEmailNotification };
