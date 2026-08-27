// Récupère les écussons des 36 équipes depuis TheSportsDB (API gratuite, sans
// clé) et les met en cache dans data/logos.json.
//
// Usage : node scripts/fetch-logos.js [--force]
//
// Le cache est versionné avec le projet : l'application n'appelle jamais l'API
// à l'exécution. Ne relancer ce script que pour rafraîchir les écussons.
//
// L'API applique une limite de débit stricte sur la clé de test ; le script
// espace les requêtes et réessaie avec un délai croissant. La progression est
// enregistrée au fur et à mesure, donc une exécution interrompue peut être
// reprise telle quelle.

const fs = require('fs');
const path = require('path');
const { TEAMS } = require('../data/teams');

const BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const CACHE_PATH = path.join(__dirname, '..', 'data', 'logos.json');
const DELAY_MS = 2500;
const MAX_RETRIES = 6;

// Noms sous lesquels TheSportsDB référence les clubs, du plus au moins probable.
// Attention : le trait d'union et la barre oblique cassent la recherche.
const SEARCH_ALIASES = {
  1: ['Paris Saint Germain', 'Paris SG'],
  2: ['Bayern Munich'],
  3: ['Real Madrid'],
  4: ['Liverpool'],
  5: ['Inter Milan'],
  6: ['Manchester City'],
  7: ['Arsenal'],
  8: ['Barcelona'],
  9: ['Atletico Madrid'],
  10: ['Borussia Dortmund'],
  11: ['AS Roma'],
  12: ['Sporting Lisbon', 'Sporting CP'],
  13: ['Aston Villa'],
  14: ['Porto'],
  15: ['Manchester United'],
  16: ['Club Brugge'],
  17: ['Real Betis'],
  18: ['PSV Eindhoven'],
  19: ['Feyenoord'],
  20: ['Lille', 'LOSC Lille'], // absent de la recherche par nom, repli par championnat
  21: ['Bodo Glimt'],          // la barre oblique de « Bodø/Glimt » casse la recherche
  22: ['Napoli'],
  23: ['RB Leipzig'],
  24: ['Villarreal'],
  25: ['Fenerbahce'],
  26: ['Shakhtar Donetsk'],
  27: ['Galatasaray'],
  28: ['Slavia Prague'],
  29: ['Slovan Bratislava'],
  30: ['VfB Stuttgart', 'Stuttgart'],
  31: ['AEK Athens'],
  32: ['LASK Linz', 'LASK'],
  33: ['Como'],                // « Como 1907 » renvoie l'équipe féminine
  34: ['Lens'],
  35: ['Viking'],
  36: ['Sabah FC'],
};

// TheSportsDB écrit certains pays autrement que le code association UEFA.
const COUNTRY_NAMES = {
  FRA: ['France'], GER: ['Germany'], ESP: ['Spain'], ENG: ['England'],
  ITA: ['Italy'], POR: ['Portugal'], BEL: ['Belgium'],
  NED: ['Netherlands', 'The Netherlands'], NOR: ['Norway'], TUR: ['Turkey', 'Türkiye'],
  UKR: ['Ukraine'], CZE: ['Czechia', 'Czech Republic'], SVK: ['Slovakia'],
  GRE: ['Greece'], AUT: ['Austria'], AZE: ['Azerbaijan'],
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Normalise un nom de club pour la comparaison : accents, ponctuation, suffixes. */
const NOISE = new Set(['fc', 'cf', 'sk', 'sc', 'ac', 'as', 'kv', 'fk', 'afc', 'club', 'de', 'the', '1907']);
function tokenize(name) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o').replace(/ş/gi, 's').replace(/š/gi, 's')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length > 1 && !NOISE.has(token));
}

/** Une équipe candidate correspond-elle vraiment au club recherché ? */
function matches(candidate, alias, countries) {
  if (candidate.strSport !== 'Soccer') return false;
  if (candidate.strGender && candidate.strGender !== 'Male') return false;
  if (/women|ladies|u1[5-9]|u2[0-3]|reserve/i.test(candidate.strTeam)) return false;
  if (!countries.includes(candidate.strCountry)) return false;

  const wanted = tokenize(alias);
  const found = tokenize(candidate.strTeam);
  return wanted.some(token => found.includes(token));
}

// Certains clubs sont absents de la recherche par nom mais présents dans le
// listage de leur championnat : on n'y recourt qu'en dernier ressort.
const LEAGUE_FALLBACK = {
  20: 'French Ligue 1',
};

/** Un appel à l'API, avec réessais tant que la limite de débit est atteinte. */
async function request(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let body;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      body = await response.text();
    } catch (error) {
      process.stdout.write(` [réseau: ${error.message}]`);
      await sleep(DELAY_MS * attempt);
      continue;
    }

    // Une page HTML signale que la limite de débit est atteinte.
    if (body.trim().startsWith('<')) {
      process.stdout.write(' [limite]');
      await sleep(3000 * attempt);
      continue;
    }
    try {
      return JSON.parse(body).teams || [];
    } catch {
      return [];
    }
  }
  return null; // limite jamais levée
}

const searchByName = query => request(`${BASE}/searchteams.php?t=${encodeURIComponent(query)}`);
const listByLeague = league => request(`${BASE}/search_all_teams.php?l=${encodeURIComponent(league)}`);

/** Retient une équipe candidate et en extrait l'écusson. */
const asLogo = hit => ({
  badge: hit.strBadge,
  source: 'TheSportsDB',
  sourceName: hit.strTeam,
  sourceId: hit.idTeam,
});

async function main() {
  const force = process.argv.includes('--force');
  const cache = !force && fs.existsSync(CACHE_PATH)
    ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
    : {};

  let fetched = 0;
  let skipped = 0;
  const missing = [];

  for (const team of TEAMS) {
    const key = String(team.seeding);
    if (cache[key] && cache[key].badge) {
      skipped++;
      continue;
    }

    process.stdout.write(`${String(team.seeding).padStart(2)} ${team.name.padEnd(28).slice(0, 28)}`);
    const countries = COUNTRY_NAMES[team.country];
    let resolved = null;

    for (const alias of SEARCH_ALIASES[team.seeding]) {
      const candidates = await searchByName(alias);
      if (candidates === null) {
        process.stdout.write(' → abandon (limite de débit persistante)\n');
        break;
      }
      const hit = candidates.find(candidate => matches(candidate, alias, countries));
      if (hit && hit.strBadge) {
        resolved = asLogo(hit);
        break;
      }
      await sleep(DELAY_MS);
    }

    // Repli : le listage du championnat ne renvoie pas le pays, on se contente
    // donc de la correspondance sur le nom.
    if (!resolved && LEAGUE_FALLBACK[team.seeding]) {
      await sleep(DELAY_MS);
      const roster = await listByLeague(LEAGUE_FALLBACK[team.seeding]) || [];
      for (const alias of SEARCH_ALIASES[team.seeding]) {
        const wanted = tokenize(alias);
        const hit = roster.find(candidate =>
          candidate.strBadge && tokenize(candidate.strTeam).some(token => wanted.includes(token)));
        if (hit) {
          resolved = asLogo(hit);
          process.stdout.write(' [via championnat]');
          break;
        }
      }
    }

    if (resolved) {
      cache[key] = resolved;
      fetched++;
      process.stdout.write(` → ${resolved.sourceName}\n`);
    } else {
      missing.push(team.name);
      process.stdout.write(' → introuvable\n');
    }

    // Sauvegarde incrémentale : une exécution interrompue reste réutilisable.
    fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
    await sleep(DELAY_MS);
  }

  console.log('');
  console.log(`Écussons en cache : ${Object.keys(cache).length} / ${TEAMS.length}`);
  console.log(`  déjà présents : ${skipped} · récupérés : ${fetched}`);
  if (missing.length > 0) {
    console.log(`  introuvables : ${missing.join(', ')}`);
    console.log('  (le client affiche un monogramme à la place)');
  }
  console.log(`Cache écrit dans ${path.relative(process.cwd(), CACHE_PATH)}`);
}

main().catch(error => {
  console.error('Échec :', error);
  process.exit(1);
});
