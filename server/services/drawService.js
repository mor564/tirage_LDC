// Orchestration du tirage : lecture des équipes, exécution du moteur de
// contraintes, construction du calendrier, persistance, puis mise en forme
// pour le client.

const { getRepository } = require('../repository');
const { runDraw, validateDraw, createRng, POTS } = require('./drawEngine');
const { buildSchedule, validateSchedule, streakReport, CALENDAR } = require('./scheduleEngine');

async function loadTeams() {
  const repository = await getRepository();
  return repository.getTeams();
}

/**
 * Exécute un tirage complet et l'enregistre.
 * @param {{ seed?: number }} options graine facultative, pour rejouer un tirage
 */
async function performDraw({ seed } = {}) {
  const repository = await getRepository();
  const teams = await repository.getTeams();
  if (teams.length !== 36) {
    throw new Error(`36 équipes attendues, ${teams.length} trouvées`);
  }

  // Le moteur raisonne sur des index de tableau : on traduit l'historique.
  const indexById = new Map(teams.map((team, index) => [team.id, index]));
  const history = (await repository.getHistory())
    .filter(entry => indexById.has(entry.homeId) && indexById.has(entry.awayId))
    .map(entry => ({
      season: entry.season,
      homeIndex: indexById.get(entry.homeId),
      awayIndex: indexById.get(entry.awayId),
    }));

  const effectiveSeed = seed === undefined ? (Math.random() * 2 ** 32) >>> 0 : seed >>> 0;

  const draw = runDraw(teams, { seed: effectiveSeed, history });
  const drawErrors = validateDraw(draw.matches, teams);
  if (drawErrors.length > 0) {
    throw new Error(`Tirage non conforme : ${drawErrors.join(' | ')}`);
  }

  const schedule = buildSchedule(draw.matches, teams, createRng(effectiveSeed ^ 0x9e3779b9));
  const scheduleErrors = validateSchedule(schedule.fixtures, teams);
  if (scheduleErrors.length > 0) {
    throw new Error(`Calendrier non conforme : ${scheduleErrors.join(' | ')}`);
  }

  const reveals = [];
  draw.revealOrder.forEach((step, stepIndex) => {
    for (const fixture of step.fixtures) {
      reveals.push({
        order: stepIndex + 1,
        pot: step.pot,
        teamId: teams[step.team].id,
        opponentId: teams[fixture.opponent].id,
        venue: fixture.venue,
        alreadyKnown: fixture.alreadyKnown,
      });
    }
  });

  const drawId = await repository.saveDraw({
    seed: effectiveSeed,
    attempts: draw.attempts,
    fixtures: schedule.fixtures.map(fixture => ({
      matchday: fixture.matchday,
      matchDate: fixture.matchDate,
      kickoff: fixture.kickoff,
      homeId: teams[fixture.home].id,
      awayId: teams[fixture.away].id,
    })),
    reveals,
  });

  return getDraw(drawId);
}

/** Charge un tirage enregistré sous la forme attendue par le client. */
async function getDraw(drawId) {
  const repository = await getRepository();
  const stored = await repository.getDraw(drawId);
  if (!stored) return null;

  const teams = await repository.getTeams();
  const byId = new Map(teams.map(team => [team.id, team]));

  const matches = stored.fixtures.map((fixture, index) => ({
    id: index + 1,
    matchday: fixture.matchday,
    date: fixture.matchDate,
    kickoff: fixture.kickoff,
    home: byId.get(fixture.homeId),
    away: byId.get(fixture.awayId),
  }));

  return {
    id: stored.id,
    seed: stored.seed,
    attempts: stored.attempts,
    createdAt: stored.createdAt,
    storage: repository.name,
    teams,
    pots: POTS.map(pot => ({ pot, teams: teams.filter(team => team.pot === pot) })),
    matches,
    matchdays: groupByMatchday(matches),
    fixtureTable: buildFixtureTable(teams, stored.fixtures, byId),
    revealOrder: groupReveals(stored.reveals, byId),
  };
}

async function getLatestDraw() {
  const repository = await getRepository();
  const latestId = await repository.getLatestDrawId();
  return latestId === null ? null : getDraw(latestId);
}

/** Calendrier regroupé par journée, puis par date de match. */
function groupByMatchday(matches) {
  return CALENDAR.map(entry => {
    const ofDay = matches.filter(match => match.matchday === entry.matchday);
    const dates = entry.dates.map(date => ({
      date,
      matches: ofDay.filter(match => match.date === date),
    }));
    return { matchday: entry.matchday, dates, total: ofDay.length };
  });
}

/** Les 8 adversaires de chaque équipe, regroupés par chapeau. */
function buildFixtureTable(teams, fixtures, byId) {
  const table = new Map(teams.map(team => [team.id, { team, opponents: [] }]));
  for (const fixture of fixtures) {
    table.get(fixture.homeId).opponents.push({
      ...byId.get(fixture.awayId), venue: 'H', matchday: fixture.matchday,
    });
    table.get(fixture.awayId).opponents.push({
      ...byId.get(fixture.homeId), venue: 'A', matchday: fixture.matchday,
    });
  }
  for (const entry of table.values()) {
    entry.opponents.sort((x, y) => x.pot - y.pot || x.venue.localeCompare(y.venue));
  }
  return [...table.values()];
}

/** Regroupe les lignes de révélation par boule tirée. */
function groupReveals(reveals, byId) {
  const steps = new Map();
  for (const reveal of reveals) {
    if (!steps.has(reveal.order)) {
      steps.set(reveal.order, {
        order: reveal.order,
        pot: reveal.pot,
        team: byId.get(reveal.teamId),
        fixtures: [],
      });
    }
    steps.get(reveal.order).fixtures.push({
      ...byId.get(reveal.opponentId),
      venue: reveal.venue,
      alreadyKnown: reveal.alreadyKnown,
    });
  }
  return [...steps.values()].sort((x, y) => x.order - y.order);
}

/** Contrôle de conformité d'un tirage enregistré (rôle de l'auditeur externe). */
async function auditDraw(drawId) {
  const draw = drawId === undefined ? await getLatestDraw() : await getDraw(drawId);
  if (!draw) return null;

  const indexById = new Map(draw.teams.map((team, index) => [team.id, index]));
  const matches = draw.matches.map(match => ({
    home: indexById.get(match.home.id),
    away: indexById.get(match.away.id),
    matchday: match.matchday,
  }));

  const errors = [
    ...validateDraw(matches, draw.teams),
    ...validateSchedule(matches, draw.teams),
  ];
  return {
    drawId: draw.id,
    seed: draw.seed,
    valid: errors.length === 0,
    errors,
    consecutiveVenueStreaks: streakReport(matches, draw.teams),
  };
}

module.exports = { performDraw, getDraw, getLatestDraw, auditDraw, loadTeams };
