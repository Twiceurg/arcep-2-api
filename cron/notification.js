const fs = require("fs");
const nodemailer = require("nodemailer");
const path = require("path");
const cron = require("node-cron");
const {
  AttributionDecision,
  Utilisateur,
  AttributionNumero,
  Notification,
  Client
} = require("../models");
const Sequelize = require("sequelize");
const moment = require("moment");
const { getIo } = require("../utils/socket"); // Importation de getIo

// Lire le template HTML à partir du fichier
const readEmailTemplate = (
  reference_decision,
  type_decision,
  date_expiration
) => {
  const templatePath = path.join(__dirname, "templates", "emailTemplate.html");

  // Vérification de l'existence du fichier template
  if (!fs.existsSync(templatePath)) {
    console.log("Template HTML non trouvé à ce chemin:", templatePath);
    return null; // Retourner null si le fichier n'existe pas
  }

  try {
    // Lire le template HTML
    let template = fs.readFileSync(templatePath, "utf8");

    // Injection des données dans le template
    template = template.replace("{{reference_decision}}", reference_decision);
    template = template.replace("{{type_decision}}", type_decision);
    template = template.replace("{{date_expiration}}", date_expiration);

    return template;
  } catch (error) {
    console.log("Erreur lors de la lecture du template HTML:", error);
    return null; // Retourner null en cas d'erreur de lecture
  }
};

// Fonction d'envoi de l'email
const sendEmailNotificationToAllUsers = async (subject, decisions) => {
  try {
    console.log("Création du transporteur Nodemailer...");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    if (!decisions || !decisions.length) {
      console.log("Aucune décision à envoyer par email.");
      return;
    }

    // Générer le contenu HTML dynamique
    let finalEmailContent = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        <p>Bonjour,</p>
        <p>Les décisions suivantes nécessitent votre attention :</p>
        <ul>
    `;

    for (const d of decisions) {
      const timeRemaining = calculateTimeRemaining(d.date_expiration);
      finalEmailContent += `
        <li>
          <strong>Type :</strong> ${d.type_decision}<br>
          <strong>Référence :</strong> ${d.reference_decision}<br>
          <strong>Client :</strong> ${d.clientName}<br>
          <strong>Date d'expiration :</strong> ${d.date_expiration}<br>
          <strong>Temps restant :</strong> ${timeRemaining}<br>
          <strong>Notification :</strong> ${d.notificationType}
        </li>
      `;
    }

    finalEmailContent += `
        </ul>
        <p>Veuillez contacter directement les clients pour leur rappeler la nécessité de procéder au renouvellement ou aux actions nécessaires.</p>
        <p>Pour toute question, vous pouvez consulter l'espace interne ou nous contacter.</p>
      </div>
    `;

    console.log("Récupération des utilisateurs à notifier...");
    const utilisateurs = await Utilisateur.findAll({
      where: { etat_compte: true }
    });

    const destinataires = ["marcel.blu@arcep.tg"];
    // ou ["marcel.blu@arcep.tg", "guichetautorisations@arcep.tg"]

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: destinataires.join(", "), // envoie à tous les destinataires
      subject: subject,
      html: finalEmailContent
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(
        `Email envoyé à : ${destinataires.join(", ")} - ${info.response}`
      );
    } catch (error) {
      console.log("Erreur d'envoi de l'email:", error);
    }

    console.log("✅ Emails envoyés pour toutes les décisions.");
  } catch (error) {
    console.error("Erreur lors de l'envoi des emails:", error);
  }
};

// Fonction pour remplacer les placeholders dans le template HTML
const replaceTemplatePlaceholders = (template, data) => {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    return data[key] || "";
  });
};

// Fonction pour calculer le temps restant jusqu'à l'expiration
const calculateTimeRemaining = (expirationDate) => {
  const expirationMoment = moment(expirationDate);
  const now = moment();

  // Si la date est déjà passée
  if (expirationMoment.isBefore(now)) {
    return "déjà expirée";
  }

  const duration = moment.duration(expirationMoment.diff(now));

  if (duration.years() > 0) {
    return `${duration.years()} an${duration.years() > 1 ? "s" : ""}`;
  } else if (duration.months() > 0) {
    return `${duration.months()} mois`;
  } else if (duration.days() > 0) {
    return `${duration.days()} jour${duration.days() > 1 ? "s" : ""}`;
  } else {
    return `${duration.hours()} heure${duration.hours() > 1 ? "s" : ""}`;
  }
};

// Fonction pour envoyer des notifications à tous les utilisateurs
const sendNotificationToAllUsers = async (message) => {
  try {
    const utilisateurs = await Utilisateur.findAll({
      where: { etat_compte: true }
    });

    const todayStart = moment().startOf("day").toDate();
    const todayEnd = moment().endOf("day").toDate();

    const notifications = utilisateurs.map(async (utilisateur) => {
      // Vérifier s'il y a déjà une notification pour cet utilisateur avec le même message aujourd'hui
      const dejaEnvoyee = await Notification.findOne({
        where: {
          user_id: utilisateur.id,
          message,
          created_at: {
            [Sequelize.Op.between]: [todayStart, todayEnd]
          }
        }
      });

      if (!dejaEnvoyee) {
        await Notification.create({
          message: message,
          user_id: utilisateur.id,
          type: "alert",
          created_at: new Date()
        });

        console.log(
          `Notification envoyée à l'utilisateur ${utilisateur.email}`
        );
      } else {
        console.log(
          `Notification déjà envoyée aujourd'hui à l'utilisateur ${utilisateur.email}`
        );
      }
    });

    await Promise.all(notifications);

    const io = getIo();
    io.emit("notification", {
      message,
      type: "alert"
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications:", error);
  }
};

const checkAndSendNotifications = async () => {
  const today = moment().startOf("day");

  const decisions = await AttributionDecision.findAll({
    where: { date_expiration: { [Sequelize.Op.ne]: null } },
    include: [{ model: AttributionNumero, include: [Client] }]
  });

  for (const decision of decisions) {
    const expiration = moment(decision.date_expiration).startOf("day");
    const diffDays = expiration.diff(today, "days");
    const clientName =
      decision.AttributionNumero?.Client?.denomination ||
      "Nom du client non trouvé";

    let notificationType = null;

    if (diffDays === 30 && !decision.notification_envoyee_1mois)
      notificationType = "1 mois avant";
    else if (diffDays === 7 && !decision.notification_envoyee_1semaine)
      notificationType = "1 semaine avant";
    else if (diffDays === 0 && !decision.notification_envoyee_jourJ)
      notificationType = "jour J";
    else if (diffDays === -7 && !decision.notification_envoyee_1semaine_apres)
      notificationType = "1 semaine après";

    if (notificationType) {
      const message = `La décision ${decision.type_decision} (Réf: ${decision.reference_decision}) pour le client ${clientName} nécessite votre attention. Notification: ${notificationType}`;
      await sendNotificationToAllUsers(message);
      await sendEmailNotificationToAllUsers("Notification décision", message);

      // Marquer comme envoyée
      const updateData = {};
      switch (notificationType) {
        case "1 mois avant":
          updateData.notification_envoyee_1mois = true;
          break;
        case "1 semaine avant":
          updateData.notification_envoyee_1semaine = true;
          break;
        case "jour J":
          updateData.notification_envoyee_jourJ = true;
          break;
        case "1 semaine après":
          updateData.notification_envoyee_1semaine_apres = true;
          break;
      }
      await decision.update(updateData);
    }
  }
};

// Fonction pour vérifier les expirations des décisions et envoyer des notifications
// const verifierExpirationEtEnvoyerNotifications = async () => {
//   try {
//     console.log(
//       "Vérification des décisions expirées et envoi de notifications..."
//     );

//     const decisionsToNotify = await AttributionDecision.findAll({
//       where: {
//         date_expiration: {
//           [Sequelize.Op.ne]: null // Vérifier que la date d'expiration existe
//         },
//         type_decision: {
//           [Sequelize.Op.in]: [
//             "attribution",
//             "renouvellement",
//             "suspension",
//             "reservation"
//           ]
//         },
//         [Sequelize.Op.or]: [
//           { etat_autorisation: false }, // Vérifier les décisions non autorisées
//           { etat_autorisation: true }
//         ]
//       },
//       include: [
//         {
//           model: AttributionNumero,
//           include: [
//             {
//               model: Client
//             }
//           ]
//         }
//       ]
//     });

//     // Décision à notifier définie
//     // if (decisionsToNotify && decisionsToNotify.date_expiration) {
//     //   const dateExpiration = moment(decisionsToNotify.date_expiration);
//     //   const today = moment();
//     //   const diff = moment.duration(dateExpiration.diff(today));

//     //   if (dateExpiration.isBefore(today) || diff.asMonths() <= 3) {
//     //     let message;
//     //     let timeRemaining;

//     //     if (dateExpiration.isBefore(today)) {
//     //       message = `La décision de type ${decisionsToNotify.type_decision} pour la référence ${decisionsToNotify.reference_decision} a expiré pour le client ${clientName}. Veuillez procéder au renouvellement.`;
//     //     } else {
//     //       if (diff.years() > 0) {
//     //         timeRemaining = `${diff.years()} an${diff.years() > 1 ? "s" : ""}`;
//     //       } else if (diff.months() > 0) {
//     //         timeRemaining = `${diff.months()} mois`;
//     //       } else if (diff.days() > 0) {
//     //         timeRemaining = `${diff.days()} jour${diff.days() > 1 ? "s" : ""}`;
//     //       } else {
//     //         timeRemaining = `${diff.hours()} heure${
//     //           diff.hours() > 1 ? "s" : ""
//     //         }`;
//     //       }

//     //       if (
//     //         decisionsToNotify.type_decision === "suspension" ||
//     //         decisionsToNotify.type_decision === "reservation"
//     //       ) {
//     //         message = `La décision de type ${decisionsToNotify.type_decision} pour la référence ${decisionsToNotify.reference_decision} va arriver à terme dans ${timeRemaining} pour le client ${clientName}. Veuillez prendre les mesures nécessaires.`;
//     //       } else {
//     //         message = `La décision de type ${decisionsToNotify.type_decision} pour la référence ${decisionsToNotify.reference_decision} va expirer dans ${timeRemaining} pour le client ${clientName}. Veuillez procéder au renouvellement.`;
//     //       }
//     //     }

//     //     const decisionTypeMap = {
//     //       renouvellement: "Renouvellement - Action requise",
//     //       attribution: "Attribution - Action requise",
//     //       suspension: "Suspension - Action requise",
//     //       reservation: "Réservation - Action requise"
//     //     };

//     //     const headerMessage = `${
//     //       decisionTypeMap[decisionsToNotify.type_decision] || "Notification"
//     //     } - Action requise dans ${timeRemaining || "un délai"} `;

//     //     // Envoi des notifications
//     //     sendEmailNotificationToAllUsers(
//     //       "Notification de décision",
//     //       decisionsToNotify.reference_decision,
//     //       decisionsToNotify.type_decision,
//     //       decisionsToNotify.date_expiration,
//     //       headerMessage,
//     //       clientName
//     //     );
//     //     sendNotificationToAllUsers(message);

//     //     console.log(
//     //       `Notification envoyée pour la référence ${decisionsToNotify.reference_decision}`
//     //     );
//     //   } else {
//     //     console.log(
//     //       `Pas de notification : plus de 3 mois restants pour la décision ${decisionsToNotify.reference_decision}`
//     //     );
//     //   }
//     // }

//     // Supposons que decisionsToNotify est un tableau d'objets

//     if (decisionsToNotify.length > 0) {
//       const now = moment();
//       const decisionsAGrouper = [];

//       // Parcours de toutes les décisions à notifier
//       for (const decision of decisionsToNotify) {
//         const dateExpiration = moment(decision.date_expiration);
//         if (!dateExpiration.isValid()) continue;

//         const diff = moment.duration(dateExpiration.diff(now));
//         const clientName =
//           decision.AttributionNumero?.Client?.denomination ||
//           "Nom du client non trouvé";

//         if (dateExpiration.isBefore(now) || diff.asMonths() <= 3) {
//           // Calcul du délai restant
//           let timeRemaining;
//           if (dateExpiration.isBefore(now)) {
//             timeRemaining = "déjà expirée";
//           } else if (diff.years() > 0) {
//             timeRemaining = `${diff.years()} an${diff.years() > 1 ? "s" : ""}`;
//           } else if (diff.months() > 0) {
//             timeRemaining = `${diff.months()} mois`;
//           } else if (diff.days() > 0) {
//             timeRemaining = `${diff.days()} jour${diff.days() > 1 ? "s" : ""}`;
//           } else {
//             timeRemaining = `${diff.hours()} heure${
//               diff.hours() > 1 ? "s" : ""
//             }`;
//           }

//           // Ajout dans la liste groupée
//           decisionsAGrouper.push({
//             type_decision: decision.type_decision,
//             reference_decision: decision.reference_decision,
//             clientName,
//             timeRemaining,
//             date_expiration: decision.date_expiration
//           });
//         }
//       }

//       if (decisionsAGrouper.length === 0) {
//         console.log("Aucune décision proche de l'expiration ou expirée.");
//         return;
//       }

//       // Construction du message texte groupé
//       const messageText = decisionsAGrouper
//         .map(
//           (d) =>
//             `- Type: ${d.type_decision}, Référence: ${d.reference_decision}, Client: ${d.clientName}, Expiration: ${d.timeRemaining}`
//         )
//         .join("\n");

//       // Construction du message HTML groupé (optionnel)
//       const messageHtml =
//         "<ul>" +
//         decisionsAGrouper
//           .map(
//             (d) =>
//               `<li><strong>${d.type_decision}</strong> - Réf: ${d.reference_decision} - Client: ${d.clientName} - Expire dans: ${d.timeRemaining}</li>`
//           )
//           .join("") +
//         "</ul>";

//       // Sujet de l'email groupé
//       const sujet =
//         "Notification groupée : décisions expirées ou proches de l'expiration";

//       // Envoi groupé
//       await sendNotificationToAllUsers(
//         `Les décisions suivantes nécessitent votre attention :\n${messageText}`
//       );
//       await sendEmailNotificationToAllUsers(sujet, messageHtml);

//       console.log("Notification groupée envoyée.");
//     }

//     // Vérification des autres décisions expirées (renouvellement, suspension, réservation)
//     const expiredDecisions = await AttributionDecision.findAll({
//       where: {
//         date_expiration: {
//           [Sequelize.Op.ne]: null,
//           [Sequelize.Op.lt]: new Date() // Vérification des décisions expirées
//         },
//         type_decision: {
//           [Sequelize.Op.in]: ["renouvellement", "suspension", "reservation"]
//         },
//         [Sequelize.Op.or]: [
//           { etat_autorisation: true },
//           { etat_autorisation: false }
//         ]
//       },
//       include: [
//         {
//           model: AttributionNumero,
//           include: [
//             {
//               model: Client
//             }
//           ]
//         }
//       ]
//     });

//     // Traitement des décisions expirées
//     // if (expiredDecisions.length > 0) {
//     //   for (const decision of expiredDecisions) {
//     //     const clientName =
//     //       decision.AttributionNumero && decision.AttributionNumero.Client
//     //         ? decision.AttributionNumero.Client.denomination
//     //         : "Nom du client non trouvé";

//     //     if (decision.type_decision === "suspension") {
//     //       // Vérifie si une notification a déjà été envoyée pour cette suspension
//     //       if (!decision.notification_envoyee) {
//     //         const message = `La suspension de la référence ${decision.reference_decision} est arrivée à terme pour le client ${clientName}.`;

//     //         // Envoi de la notification
//     //         sendNotificationToAllUsers(message);

//     //         // Envoi de l'email
//     //         sendEmailNotificationToAllUsers(
//     //           "Suspension Expirée",
//     //           decision.reference_decision,
//     //           "Suspension",
//     //           decision.date_expiration,
//     //           `Suspension expirée - Action requise pour la référence ${decision.reference_decision}`
//     //         );

//     //         // Mets à jour le champ `notification_envoyee` à true pour éviter l'envoi multiple
//     //         await decision.update({
//     //           notification_envoyee: true
//     //         });

//     //         console.log(
//     //           `Notification envoyée pour la suspension ${decision.reference_decision}`
//     //         );
//     //       } else {
//     //         console.log(
//     //           `Notification déjà envoyée pour la suspension ${decision.reference_decision}`
//     //         );
//     //       }
//     //     } else if (decision.type_decision === "reclamation") {
//     //       const message = `La réclamation de la référence ${decision.reference_decision} est arrivée à terme pour le client ${clientName}..`;
//     //       sendNotificationToAllUsers(message);

//     //       // Envoi de l'email
//     //       sendEmailNotificationToAllUsers(
//     //         "Réclamation Expirée",
//     //         decision.reference_decision,
//     //         "Réclamation",
//     //         decision.date_expiration,
//     //         `Réclamation expirée - Action requise pour la référence ${decision.reference_decision}`,
//     //         clientName
//     //       );
//     //     } else if (decision.type_decision === "renouvellement") {
//     //       const message = `Le renouvellement de la référence ${decision.reference_decision} est arrivé à terme pour le client ${clientName}..`;
//     //       sendNotificationToAllUsers(message);

//     //       // Envoi de l'email
//     //       sendEmailNotificationToAllUsers(
//     //         "Renouvellement Expiré",
//     //         decision.reference_decision,
//     //         "Renouvellement",
//     //         decision.date_expiration,
//     //         `Renouvellement expiré - Action requise pour la référence ${decision.reference_decision}`,
//     //         clientName
//     //       );
//     //     } else if (decision.type_decision === "reservation") {
//     //       const message = `La réservation de la référence ${decision.reference_decision} est arrivée à terme pour le client ${clientName}.`;
//     //       sendNotificationToAllUsers(message);

//     //       // Envoi de l'email
//     //       sendEmailNotificationToAllUsers(
//     //         "Réservation Expirée",
//     //         decision.reference_decision,
//     //         "Réservation",
//     //         decision.date_expiration,
//     //         `Réservation expirée - Action requise pour la référence ${decision.reference_decision}`,
//     //         clientName
//     //       );
//     //     }
//     //   }
//     // }

//     if (expiredDecisions.length > 0) {
//       // Tableau pour stocker les infos à notifier en groupe
//       const decisionsAGrouper = [];

//       for (const decision of expiredDecisions) {
//         const clientName =
//           decision.AttributionNumero && decision.AttributionNumero.Client
//             ? decision.AttributionNumero.Client.denomination
//             : "Nom du client non trouvé";

//         decisionsAGrouper.push({
//           type_decision: decision.type_decision,
//           reference_decision: decision.reference_decision,
//           clientName,
//           date_expiration: decision.date_expiration,
//           notification_envoyee: decision.notification_envoyee,
//           id: decision.id // pour mise à jour éventuelle
//         });
//       }

//       // Construire un message texte groupé
//       const messageText = decisionsAGrouper
//         .map((d) => {
//           let texteType;
//           switch (d.type_decision) {
//             case "suspension":
//               texteType = `La suspension de la référence ${d.reference_decision} est arrivée à terme pour le client ${d.clientName}.`;
//               break;
//             case "reclamation":
//               texteType = `La réclamation de la référence ${d.reference_decision} est arrivée à terme pour le client ${d.clientName}.`;
//               break;
//             case "renouvellement":
//               texteType = `Le renouvellement de la référence ${d.reference_decision} est arrivé à terme pour le client ${d.clientName}.`;
//               break;
//             case "reservation":
//               texteType = `La réservation de la référence ${d.reference_decision} est arrivée à terme pour le client ${d.clientName}.`;
//               break;
//             default:
//               texteType = `Décision de type ${d.type_decision} arrivée à terme pour la référence ${d.reference_decision} (client ${d.clientName}).`;
//           }
//           return texteType;
//         })
//         .join("\n");

//       // Construire un message HTML groupé (optionnel)
//       const messageHtml =
//         "<ul>" +
//         decisionsAGrouper
//           .map(
//             (d) =>
//               `<li><strong>${d.type_decision}</strong> - Réf: ${d.reference_decision} - Client: ${d.clientName}</li>`
//           )
//           .join("") +
//         "</ul>";

//       // Envoyer notification groupée
//       await sendNotificationToAllUsers(
//         `Les décisions suivantes sont arrivées à terme :\n${messageText}`
//       );
//       await sendEmailNotificationToAllUsers(
//         "Notifications groupées des décisions expirées",
//         messageHtml
//       );

//       // Mettre à jour le champ notification_envoyee pour les suspensions non encore notifiées
//       for (const d of decisionsAGrouper) {
//         if (d.type_decision === "suspension" && !d.notification_envoyee) {
//           const decisionInstance = expiredDecisions.find(
//             (dec) => dec.id === d.id
//           );
//           if (decisionInstance) {
//             await decisionInstance.update({ notification_envoyee: true });
//           }
//         }
//       }

//       console.log(
//         "Notifications groupées envoyées pour les décisions expirées."
//       );
//     } else {
//       console.log("Aucune décision expirée à notifier.");
//     }
//   } catch (error) {
//     console.error("Erreur lors de la vérification des expirations:", error);
//   }
// };

const verifierExpirationEtEnvoyerNotifications = async () => {
  try {
    console.log("🔍 Vérification des décisions expirées et notifications...");

    const today = moment().startOf("day");

    // Récupérer toutes les décisions avec date d'expiration
    const decisions = await AttributionDecision.findAll({
      where: { date_expiration: { [Sequelize.Op.ne]: null } },
      include: [{ model: AttributionNumero, include: [Client] }]
    });

    if (!decisions.length) {
      console.log("Aucune décision à traiter.");
      return;
    }

    // Tableaux pour notifications
    const decisionsToNotify = [];
    const expiredDecisionsToNotify = [];

    for (const decision of decisions) {
      const expiration = moment(decision.date_expiration).startOf("day");
      const diffDays = expiration.diff(today, "days");
      const clientName =
        decision.AttributionNumero?.Client?.denomination ||
        "Nom du client non trouvé";

      let notificationType = null;

      // Notifications programmées
      if (diffDays === 30 && !decision.notification_envoyee_1mois) {
        notificationType = "1 mois avant";
        decision.notification_envoyee_1mois = true;
      } else if (diffDays === 7 && !decision.notification_envoyee_1semaine) {
        notificationType = "1 semaine avant";
        decision.notification_envoyee_1semaine = true;
      } else if (diffDays === 0 && !decision.notification_envoyee_jourJ) {
        notificationType = "jour J";
        decision.notification_envoyee_jourJ = true;
      } else if (
        diffDays === -7 &&
        !decision.notification_envoyee_1semaine_apres
      ) {
        notificationType = "1 semaine après";
        decision.notification_envoyee_1semaine_apres = true;
      }

      if (notificationType) {
        decisionsToNotify.push({
          type_decision: decision.type_decision,
          reference_decision: decision.reference_decision,
          clientName,
          date_expiration: decision.date_expiration,
          notificationType
        });
        await decision.save(); // mise à jour
      }

      // Notifications pour décisions déjà expirées
      if (expiration.isBefore(today) && !notificationType) {
        expiredDecisionsToNotify.push({
          type_decision: decision.type_decision,
          reference_decision: decision.reference_decision,
          clientName,
          date_expiration: decision.date_expiration,
          notificationType: "déjà expirée"
        });
      }
    }

    // Envoi notifications programmées
    if (decisionsToNotify.length > 0) {
      await sendEmailNotificationToAllUsers(
        "Notifications décisions - À suivre",
        decisionsToNotify
      );

      const messageText = decisionsToNotify
        .map(
          (d) =>
            `Type: ${d.type_decision}, Réf: ${d.reference_decision}, Client: ${
              d.clientName
            }, Expiration: ${calculateTimeRemaining(
              d.date_expiration
            )}, Notification: ${d.notificationType}`
        )
        .join("\n");

      await sendNotificationToAllUsers(`Décisions à suivre :\n${messageText}`);
      console.log("✅ Notifications programmées envoyées.");
    } else {
      console.log("Aucune notification programmée à envoyer aujourd'hui.");
    }

    // Envoi notifications pour décisions déjà expirées
    // if (expiredDecisionsToNotify.length > 0) {
    //   const messageTextExpired = expiredDecisionsToNotify
    //     .map(
    //       (d) =>
    //         `Type: ${d.type_decision}, Réf: ${d.reference_decision}, Client: ${
    //           d.clientName
    //         }, Expiration: ${calculateTimeRemaining(d.date_expiration)} (${
    //           d.notificationType
    //         })`
    //     )
    //     .join("\n");

    //   await sendEmailNotificationToAllUsers(
    //     "Décisions déjà expirées",
    //     expiredDecisionsToNotify
    //   );
    //   await sendNotificationToAllUsers(
    //     `Décisions déjà expirées :\n${messageTextExpired}`
    //   );

    //   console.log("✅ Notifications pour décisions expirées envoyées.");
    // } else {
    //   console.log("Aucune décision expirée à notifier.");
    // }

    console.log("✅ Vérification et envoi des notifications terminés.");
  } catch (error) {
    console.error("❌ Erreur lors de la vérification des expirations:", error);
  }
};

// Cette tâche s'exécute tous les jours à minuit
cron.schedule("0 */2 * * *", () => {
  console.log(
    "Vérification des expirations des décisions et envoi de notifications..."
  );
  verifierExpirationEtEnvoyerNotifications();
});

module.exports = { verifierExpirationEtEnvoyerNotifications };
