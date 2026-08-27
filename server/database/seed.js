// Insère les 36 participants dans la table `teams`.
// Usage : node database/seed.js  (depuis le dossier server/)

require('dotenv').config();
const db = require('../db');
const { TEAMS } = require('../data/teams');

async function seed() {
  const rows = TEAMS.map(team => [team.seeding, team.name, team.shortName, team.country, team.pot]);
  await db.query(
    `INSERT INTO teams (id, name, short_name, country, pot) VALUES ?
     ON DUPLICATE KEY UPDATE name = VALUES(name), short_name = VALUES(short_name),
                             country = VALUES(country), pot = VALUES(pot)`,
    [rows]
  );
  console.log(`${rows.length} équipes insérées.`);
  await db.end();
}

seed().catch(error => {
  console.error('Échec du seed :', error.message);
  process.exit(1);
});
