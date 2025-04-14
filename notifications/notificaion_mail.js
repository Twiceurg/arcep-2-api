const fs = require('fs');
const nodemailer = require('nodemailer');
const path = require('path');

// Lire le template HTML à partir du fichier
const readEmailTemplate = (reference_decision, type_decision, date_expiration) => {
  const templatePath = path.join(__dirname, 'templates', 'emailTemplate.html');
  let template = fs.readFileSync(templatePath, 'utf8');

  // Injecter les données dans le template
  template = template.replace('{{reference_decision}}', reference_decision);
  template = template.replace('{{type_decision}}', type_decision);
  template = template.replace('{{date_expiration}}', date_expiration);

  return template;
};

// Fonction d'envoi de l'email
const sendEmailNotificationToAllUsers = async (subject, reference_decision, type_decision, date_expiration) => {
  try {
    // Créer un transporteur Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Lire le template HTML et l'injecter avec les données
    const emailTemplate = readEmailTemplate(reference_decision, type_decision, date_expiration);

    // Récupérer les utilisateurs à notifier
    const utilisateurs = await Utilisateur.findAll({
      where: { etat_compte: true }
    });

    // Pour chaque utilisateur, envoyer l'email
    for (const utilisateur of utilisateurs) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: utilisateur.email,
        subject: subject,
        html: emailTemplate
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(`Erreur d'envoi de l'email à ${utilisateur.email}:`, error);
        } else {
          console.log(`Email envoyé à ${utilisateur.email}: ${info.response}`);
        }
      });
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi des e-mails:", error);
  }
};
