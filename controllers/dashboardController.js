const { Op } = require('sequelize');
const { AttributionNumero, Pnn, NumeroAttribue } = require('../models');

const getTotalAndRemainingNumbers = async (req, res) => {
  try {
    const utilisationId = req.params.utilisationId;
    const { start_date, end_date } = req.query;

    console.log('Paramètres reçus - utilisationId:', utilisationId, 'start_date:', start_date, 'end_date:', end_date);

    const whereConditions = {
      utilisation_id: utilisationId,
    };

    // Ajouter des conditions de date si présentes dans les paramètres
    if (start_date && end_date) {
      whereConditions.date_attribution = {
        [Op.between]: [new Date(start_date), new Date(end_date)],
      };
      console.log('Conditions de date:', whereConditions.date_attribution);
    }

    // Récupération des attributions associées à cette utilisationId
    const attributions = await AttributionNumero.findAll({
      where: whereConditions,
      include: [
        {
          model: NumeroAttribue,
          attributes: ['id', 'statut', 'pnn_id', 'numero_attribue'],
          where: {
            statut: {
              [Op.in]: ['libre', 'attribue', 'retire'],
            },
          },
          required: false,
        },
        {
          model: Pnn,
          attributes: ['id', 'bloc_min', 'block_max'],
          required: false,
        },
      ],
    });

    console.log('Attributions récupérées:', attributions); // Debug: Vérifier les données récupérées

    let totalNumbers = 0;
    let allocatedNumbers = 0;

    // Traitement des données récupérées pour chaque Pnn associé à l'utilisationId
    attributions.forEach((attr) => {
      console.log('Traitement de l\'attribution:', attr); // Debug: Vérifier l'attribution en cours de traitement

      // Pour chaque Pnn associé à l'AttributionNumero
      (attr.Pnns || []).forEach(pnn => {
        console.log('Traitement du Pnn:', pnn); // Debug: Détails du Pnn

        // Calcule le total des numéros possibles dans la plage de chaque Pnn
        totalNumbers += pnn.block_max - pnn.bloc_min + 1;

        // Compte les numéros attribués dans cette plage de Pnn
        const allocatedForPnn = attr.NumeroAttribues.filter(
          (num) => num.pnn_id === pnn.id && num.statut !== 'libre' && num.statut !== 'reservation'
        ).length;

        console.log('Numéros attribués pour ce Pnn:', allocatedForPnn); // Debug: Voir les numéros attribués pour chaque Pnn
        allocatedNumbers += allocatedForPnn;
      });
    });

    // Calcul des numéros restants
    const remainingNumbers = totalNumbers - allocatedNumbers;

    console.log('Total des numéros:', totalNumbers);
    console.log('Numéros attribués:', allocatedNumbers);
    console.log('Numéros restants:', remainingNumbers);

    return res.json({
      success: true,
      data: {
        total_numbers: totalNumbers,
        allocated_numbers: allocatedNumbers,
        remaining_numbers: remainingNumbers,
      },
    });
  } catch (error) {
    console.error('Error fetching total and remaining numbers:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getTotalAndRemainingNumbers,
};
