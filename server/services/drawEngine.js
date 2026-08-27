// Moteur de tirage de la phase de ligue (règlement art. 16.01 à 16.03).
// Logique pure : aucune dépendance à la base de données, entièrement déterministe
// pour une graine donnée, ce qui permet de rejouer un tirage à l'identique.

const POTS = [1, 2, 3, 4];
const OPPONENTS_PER_POT = 2;      // 2 adversaires par chapeau (art. 16.02)
const MAX_PER_ASSOCIATION = 2;    // au plus 2 adversaires d'une même association

/**
 * Générateur pseudo-aléatoire à graine (mulberry32) : le tirage doit être
 * reproductible pour pouvoir être rejoué et vérifié par l'auditeur externe.
 */
function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(array, rng) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const pairKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/**
 * État d'avancement des appariements, partagé par le tirage séquentiel et par
 * le solveur qui lui sert d'oracle de faisabilité.
 */
function createPairingState(teams) {
  const potMembers = new Map(POTS.map(pot => [pot, []]));
  teams.forEach((team, index) => potMembers.get(team.pot).push(index));

  return {
    teams,
    potMembers,
    // need[i][p] : nombre d'adversaires du chapeau p restant à trouver pour l'équipe i
    need: teams.map(() => ({ 1: OPPONENTS_PER_POT, 2: OPPONENTS_PER_POT, 3: OPPONENTS_PER_POT, 4: OPPONENTS_PER_POT })),
    assocCount: teams.map(() => new Map()),
    paired: new Set(),
    edges: [],
  };
}

const countAssoc = (state, i, country) => state.assocCount[i].get(country) || 0;

/** Adversaires du chapeau `pot` encore admissibles pour l'équipe `i`. */
function candidatesFor(state, i, pot) {
  const { teams } = state;
  const team = teams[i];
  const result = [];
  for (const j of state.potMembers.get(pot)) {
    if (j === i) continue;
    if (state.need[j][team.pot] === 0) continue;
    if (teams[j].country === team.country) continue;                    // art. 16.02
    if (state.paired.has(pairKey(i, j))) continue;                      // une seule rencontre par paire
    if (countAssoc(state, i, teams[j].country) >= MAX_PER_ASSOCIATION) continue;
    if (countAssoc(state, j, team.country) >= MAX_PER_ASSOCIATION) continue;
    result.push(j);
  }
  return result;
}

function link(state, i, j) {
  const { teams } = state;
  state.paired.add(pairKey(i, j));
  state.need[i][teams[j].pot]--;
  state.need[j][teams[i].pot]--;
  state.assocCount[i].set(teams[j].country, countAssoc(state, i, teams[j].country) + 1);
  state.assocCount[j].set(teams[i].country, countAssoc(state, j, teams[i].country) + 1);
  state.edges.push([i, j]);
}

function unlink(state, i, j) {
  const { teams } = state;
  state.paired.delete(pairKey(i, j));
  state.need[i][teams[j].pot]++;
  state.need[j][teams[i].pot]++;
  state.assocCount[i].set(teams[j].country, countAssoc(state, i, teams[j].country) - 1);
  state.assocCount[j].set(teams[i].country, countAssoc(state, j, teams[i].country) - 1);
  state.edges.pop();
}

/**
 * Oracle de faisabilité : existe-t-il au moins une façon de compléter les
 * appariements restants en respectant toutes les conditions ?
 *
 * Backtracking avec heuristique MRV — on traite toujours le créneau le moins
 * pourvu en candidats, ce qui fait remonter les impasses immédiatement.
 * L'état est intégralement restauré avant de rendre la main : cette recherche
 * ne sert qu'à valider un choix, jamais à le faire.
 */
function canComplete(state, rng, { maxNodes = 200000 } = {}) {
  const added = [];
  let nodes = 0;

  function selectSlot() {
    let best = null;
    let bestCount = Infinity;
    for (let i = 0; i < state.teams.length; i++) {
      for (const pot of POTS) {
        if (state.need[i][pot] === 0) continue;
        const options = candidatesFor(state, i, pot);
        if (options.length < bestCount) {
          best = { team: i, pot, options };
          bestCount = options.length;
          if (bestCount === 0) return best; // impasse : inutile de chercher plus loin
        }
      }
    }
    return best;
  }

  function search() {
    if (++nodes > maxNodes) throw new Error('NODE_LIMIT');
    const slot = selectSlot();
    if (!slot) return true;                    // tous les créneaux sont remplis
    if (slot.options.length === 0) return false;
    for (const opponent of shuffled(slot.options, rng)) {
      link(state, slot.team, opponent);
      added.push([slot.team, opponent]);
      if (search()) return true;
      added.pop();
      unlink(state, slot.team, opponent);
    }
    return false;
  }

  try {
    return search();
  } finally {
    // Restauration : les arêtes sont retirées dans l'ordre inverse de l'ajout.
    for (let k = added.length - 1; k >= 0; k--) unlink(state, added[k][0], added[k][1]);
  }
}

/**
 * Étape 1 — appariements, dans l'ordre du tirage officiel.
 *
 * Les boules du chapeau 1 sortent une à une, puis celles des chapeaux 2, 3 et 4.
 * Pour chaque équipe tirée, les adversaires encore inconnus sont attribués
 * chapeau par chapeau, en commençant par le chapeau 1 puis les suivants dans
 * l'ordre décroissant du classement.
 *
 * Chaque adversaire est choisi au hasard parmi ceux qui respectent les
 * conditions du règlement *et* qui laissent le tirage complétable pour toutes
 * les équipes restantes — c'est la garantie exigée au paragraphe « Draw
 * system » : « ensuring that a valid allocation is made, guaranteeing the full
 * draw […] can be completed for all teams ».
 *
 * Suivre l'ordre du tirage plutôt que l'ordre du solveur est essentiel : une
 * heuristique qui traite d'abord les équipes les plus contraintes fausse
 * sensiblement les probabilités des affiches.
 */
function buildPairings(teams, rng) {
  const state = createPairingState(teams);

  const bowlOrder = [];
  for (const pot of POTS) {
    bowlOrder.push(...shuffled(state.potMembers.get(pot), rng));
  }

  for (const team of bowlOrder) {
    for (const pot of POTS) {
      while (state.need[team][pot] > 0) {
        let placed = false;
        for (const opponent of shuffled(candidatesFor(state, team, pot), rng)) {
          link(state, team, opponent);
          if (canComplete(state, rng)) {
            placed = true;
            break;
          }
          unlink(state, team, opponent);
        }
        if (!placed) return null; // aucun adversaire viable : nouveau tirage
      }
    }
  }

  return state.edges.map(([i, j]) => ({ a: i, b: j }));
}

/**
 * Décompose un ensemble d'arêtes 2-régulier en cycles disjoints.
 */
function extractCycles(edges) {
  const adjacency = new Map();
  edges.forEach((edge, index) => {
    for (const [from, to] of [[edge.a, edge.b], [edge.b, edge.a]]) {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from).push({ to, index });
    }
  });

  const usedEdge = new Set();
  const cycles = [];
  for (const start of adjacency.keys()) {
    for (const first of adjacency.get(start)) {
      if (usedEdge.has(first.index)) continue;
      const cycle = [];
      let current = start;
      let step = first;
      while (step && !usedEdge.has(step.index)) {
        usedEdge.add(step.index);
        cycle.push({ from: current, to: step.to, index: step.index });
        current = step.to;
        step = adjacency.get(current).find(next => !usedEdge.has(next.index));
      }
      cycles.push(cycle);
    }
  }
  return cycles;
}

/**
 * Étape 2 — domicile / extérieur.
 *
 * Pour chaque paire de chapeaux (i, j), le sous-graphe des rencontres est
 * 2-régulier, donc une union de cycles disjoints. Orienter un cycle dans un sens
 * unique donne à chaque sommet exactement une arête sortante (réception) et une
 * arête entrante (déplacement) : la condition « un adversaire à domicile et
 * l'autre à l'extérieur par chapeau » est donc toujours satisfaisable.
 *
 * Restent deux sens possibles par cycle : on retient celui qui respecte la règle
 * du comité (une même affiche ne peut pas garder le même hôte trois saisons
 * consécutives).
 */
function orientPairings(edges, teams, forbiddenHosts, rng) {
  const groups = new Map();
  for (const edge of edges) {
    const [low, high] = [teams[edge.a].pot, teams[edge.b].pot].sort();
    const key = `${low}-${high}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(edge);
  }

  const oriented = [];
  for (const groupEdges of groups.values()) {
    for (const cycle of extractCycles(groupEdges)) {
      // violations[0] : sens direct ; violations[1] : sens inverse
      const violations = [0, 0];
      for (const { from, to } of cycle) {
        if (forbiddenHosts.has(`${from}>${to}`)) violations[0]++;
        if (forbiddenHosts.has(`${to}>${from}`)) violations[1]++;
      }
      let reverse;
      if (violations[0] === 0 && violations[1] === 0) reverse = rng() < 0.5;
      else if (violations[0] === 0) reverse = false;
      else if (violations[1] === 0) reverse = true;
      else return null; // aucun sens valide : il faut refaire les appariements
      for (const { from, to } of cycle) {
        oriented.push(reverse ? { home: to, away: from } : { home: from, away: to });
      }
    }
  }
  return oriented;
}

/**
 * Construit l'ensemble des couples (hôte, visiteur) interdits : une même affiche
 * ne peut pas être rejouée avec le même hôte trois saisons de suite.
 * `history` = [{ season, homeIndex, awayIndex }] sur les saisons précédentes.
 */
function buildForbiddenHosts(history) {
  if (!history || history.length === 0) return new Set();
  const seasons = [...new Set(history.map(entry => entry.season))].sort((a, b) => b - a).slice(0, 2);
  if (seasons.length < 2) return new Set();

  const bySeason = seasons.map(season =>
    new Set(history.filter(entry => entry.season === season).map(entry => `${entry.homeIndex}>${entry.awayIndex}`))
  );
  return new Set([...bySeason[0]].filter(fixture => bySeason[1].has(fixture)));
}

/**
 * Vérifie a posteriori l'intégralité des conditions du règlement.
 * Retourne la liste des violations (vide si le tirage est conforme).
 */
function validateDraw(matches, teams) {
  const errors = [];
  const stats = teams.map(() => ({
    opponents: new Set(),
    perPot: { 1: 0, 2: 0, 3: 0, 4: 0 },
    homePerPot: { 1: 0, 2: 0, 3: 0, 4: 0 },
    awayPerPot: { 1: 0, 2: 0, 3: 0, 4: 0 },
    perCountry: new Map(),
  }));

  if (matches.length !== 144) errors.push(`144 matchs attendus, ${matches.length} obtenus`);

  for (const { home, away } of matches) {
    if (teams[home].country === teams[away].country) {
      errors.push(`Même association : ${teams[home].name} / ${teams[away].name}`);
    }
    for (const [self, other, venue] of [[home, away, 'home'], [away, home, 'away']]) {
      const stat = stats[self];
      if (stat.opponents.has(other)) errors.push(`Affiche en double : ${teams[self].name} / ${teams[other].name}`);
      stat.opponents.add(other);
      stat.perPot[teams[other].pot]++;
      stat[venue === 'home' ? 'homePerPot' : 'awayPerPot'][teams[other].pot]++;
      stat.perCountry.set(teams[other].country, (stat.perCountry.get(teams[other].country) || 0) + 1);
    }
  }

  stats.forEach((stat, index) => {
    const team = teams[index];
    if (stat.opponents.size !== 8) errors.push(`${team.name} : ${stat.opponents.size} adversaires au lieu de 8`);
    for (const pot of POTS) {
      if (stat.perPot[pot] !== OPPONENTS_PER_POT) {
        errors.push(`${team.name} : ${stat.perPot[pot]} adversaires du chapeau ${pot} au lieu de 2`);
      }
      if (stat.homePerPot[pot] !== 1 || stat.awayPerPot[pot] !== 1) {
        errors.push(`${team.name} : chapeau ${pot} — ${stat.homePerPot[pot]} à domicile / ${stat.awayPerPot[pot]} à l'extérieur au lieu de 1/1`);
      }
    }
    for (const [country, count] of stat.perCountry) {
      if (count > MAX_PER_ASSOCIATION) errors.push(`${team.name} : ${count} adversaires de l'association ${country} (max 2)`);
    }
  });

  return errors;
}

/**
 * Reconstitue l'ordre de révélation du tirage télévisé : les équipes du chapeau 1
 * sont sorties du bol une à une, puis celles du chapeau 2, etc. Pour chaque
 * équipe, les adversaires déjà révélés lors des tours précédents sont marqués
 * comme tels — leur nombre décroît au fil du tirage.
 */
function buildRevealOrder(matches, teams, rng) {
  const opponentsOf = teams.map(() => []);
  for (const { home, away } of matches) {
    opponentsOf[home].push({ opponent: away, venue: 'H' });
    opponentsOf[away].push({ opponent: home, venue: 'A' });
  }

  const revealed = new Set();
  const steps = [];
  for (const pot of POTS) {
    const bowl = shuffled(teams.map((team, index) => index).filter(index => teams[index].pot === pot), rng);
    for (const index of bowl) {
      const fixtures = opponentsOf[index]
        .slice()
        .sort((x, y) => teams[x.opponent].pot - teams[y.opponent].pot || teams[x.opponent].seeding - teams[y.opponent].seeding)
        .map(fixture => ({ ...fixture, alreadyKnown: revealed.has(pairKey(index, fixture.opponent)) }));
      fixtures.forEach(fixture => revealed.add(pairKey(index, fixture.opponent)));
      steps.push({ pot, team: index, fixtures });
    }
  }
  return steps;
}

/**
 * Exécute un tirage complet.
 * @returns {{ seed:number, attempts:number, matches:Array, revealOrder:Array }}
 */
function runDraw(teams, { seed = (Math.random() * 2 ** 32) >>> 0, history = [], maxAttempts = 50 } = {}) {
  const rng = createRng(seed);
  const forbiddenHosts = buildForbiddenHosts(history);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let edges;
    try {
      edges = buildPairings(teams, rng);
    } catch (error) {
      if (error.message === 'NODE_LIMIT') continue; // redémarrage aléatoire
      throw error;
    }
    if (!edges) continue;

    const matches = orientPairings(edges, teams, forbiddenHosts, rng);
    if (!matches) continue;

    if (validateDraw(matches, teams).length > 0) continue;

    return { seed, attempts: attempt, matches, revealOrder: buildRevealOrder(matches, teams, rng) };
  }
  throw new Error(`Aucune configuration valide trouvée après ${maxAttempts} tentatives`);
}

module.exports = {
  runDraw,
  validateDraw,
  buildPairings,
  orientPairings,
  buildForbiddenHosts,
  createRng,
  shuffled,
  POTS,
  MAX_PER_ASSOCIATION,
};
