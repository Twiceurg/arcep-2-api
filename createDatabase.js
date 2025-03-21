require('dotenv').config();
const { Sequelize } = require('sequelize'); // Import de Sequelize

const sequelize = new Sequelize({
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false, 
});

const createDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion réussie au serveur MySQL.');
    const dbName = process.env.DB_NAME_DEV;
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);

    console.log(`La base de données "${dbName}" a été créée ou existe déjà.`);
    sequelize.config.database = dbName;
    await sequelize.authenticate();
    console.log(`Connexion réussie à la base de données "${dbName}".`);
    await sequelize.close();
  } catch (error) {
    console.error('Erreur de connexion ou de création de la base de données:', error);
  }
};

createDatabase();
