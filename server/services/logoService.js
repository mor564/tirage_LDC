// Écussons des clubs, servis depuis le cache local data/logos.json alimenté par
// `node scripts/fetch-logos.js` (source : TheSportsDB, API gratuite).
//
// Le cache est lu une seule fois au démarrage : aucune requête vers l'API
// externe n'est faite pendant l'exécution. Une équipe sans écusson reçoit
// simplement `logo: null`, et le client affiche un monogramme.

const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '..', 'data', 'logos.json');

let cache = null;

function loadCache() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[logos] Cache illisible (${error.message}) — écussons désactivés.`);
    } else {
      console.warn('[logos] Aucun cache d\'écussons — lancez `node scripts/fetch-logos.js`.');
    }
    cache = {};
  }
  return cache;
}

/** Ajoute le champ `logo` (URL ou null) à chaque équipe. */
function withLogos(teams) {
  const logos = loadCache();
  return teams.map(team => ({
    ...team,
    logo: (logos[String(team.id ?? team.seeding)] || {}).badge || null,
  }));
}

module.exports = { withLogos };
