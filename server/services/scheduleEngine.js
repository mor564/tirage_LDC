// Répartition des 144 matchs sur les 8 journées de la phase de ligue,
// puis affectation des dates et des coups d'envoi selon le calendrier officiel.

const { shuffled } = require('./drawEngine');

const MATCHDAYS = 8;
const MATCHES_PER_MATCHDAY = 18;

// Calendrier officiel : dates de match et horaires (CET).
// La dernière journée se dispute intégralement le même soir à 21h00.
const CALENDAR = [
  { matchday: 1, dates: ['2026-09-08', '2026-09-09', '2026-09-10'] },
  { matchday: 2, dates: ['2026-10-13', '2026-10-14'] },
  { matchday: 3, dates: ['2026-10-20', '2026-10-21'] },
  { matchday: 4, dates: ['2026-11-03', '2026-11-04'] },
  { matchday: 5, dates: ['2026-11-24', '2026-11-25'] },
  { matchday: 6, dates: ['2026-12-08', '2026-12-09'] },
  { matchday: 7, dates: ['2027-01-19', '2027-01-20'] },
  { matchday: 8, dates: ['2027-01-27'], singleKickoff: '21:00' },
];

const EARLY_KICKOFF = '18:45';
const LATE_KICKOFF = '21:00';
const EARLY_PER_DAY = 2; // 2 matchs à 18h45 par soirée, le reste à 21h00

/**
 * Attribue une journée à chaque match : chaque équipe joue exactement une fois
 * par journée, soit 18 matchs par journée.
 *
 * Formellement, il s'agit d'une coloration des arêtes du graphe 8-régulier des
 * rencontres avec 8 couleurs. Résolution par backtracking MRV : on colore
 * toujours le match ayant le moins de journées encore disponibles.
 *
 * L'ordre d'essai des journées privilégie celles qui n'enchaînent pas une
 * troisième réception ou un troisième déplacement consécutif — contrainte
 * souple, relâchée si aucune journée ne la respecte.
 */
function assignMatchdays(matches, teamCount, rng, { maxNodes = 500000 } = {}) {
  const allDays = Array.from({ length: MATCHDAYS }, (_, i) => i + 1);
  // venue[team][matchday] = 'H' | 'A' | undefined
  const venue = Array.from({ length: teamCount }, () => new Array(MATCHDAYS + 1));
  const dayLoad = new Array(MATCHDAYS + 1).fill(0);
  const assigned = new Array(matches.length).fill(0);
  let nodes = 0;

  const availableDays = index => {
    const { home, away } = matches[index];
    return allDays.filter(day => !venue[home][day] && !venue[away][day] && dayLoad[day] < MATCHES_PER_MATCHDAY);
  };

  /** Nombre de séries de 3 réceptions (ou 3 déplacements) consécutives créées. */
  const streakPenalty = (team, day, mark) => {
    const at = d => (d === day ? mark : venue[team][d]);
    let penalty = 0;
    for (let start = Math.max(1, day - 2); start <= Math.min(MATCHDAYS - 2, day); start++) {
      if (at(start) === mark && at(start + 1) === mark && at(start + 2) === mark) penalty++;
    }
    return penalty;
  };

  function search(remaining) {
    if (++nodes > maxNodes) throw new Error('NODE_LIMIT');
    if (remaining === 0) return true;

    let target = -1;
    let options = null;
    for (let index = 0; index < matches.length; index++) {
      if (assigned[index]) continue;
      const days = availableDays(index);
      if (!options || days.length < options.length) {
        target = index;
        options = days;
        if (days.length === 0) return false;
      }
    }

    const { home, away } = matches[target];
    const ordered = shuffled(options, rng)
      .map(day => ({ day, penalty: streakPenalty(home, day, 'H') + streakPenalty(away, day, 'A') }))
      .sort((x, y) => x.penalty - y.penalty)
      .map(entry => entry.day);

    for (const day of ordered) {
      assigned[target] = day;
      venue[home][day] = 'H';
      venue[away][day] = 'A';
      dayLoad[day]++;
      if (search(remaining - 1)) return true;
      assigned[target] = 0;
      venue[home][day] = undefined;
      venue[away][day] = undefined;
      dayLoad[day]--;
    }
    return false;
  }

  return search(matches.length) ? assigned.slice() : null;
}

/** Nombre total de séries de 3 réceptions (ou 3 déplacements) consécutives. */
function countStreaks(matches, days, teamCount) {
  const venue = Array.from({ length: teamCount }, () => new Array(MATCHDAYS + 1));
  matches.forEach((match, index) => {
    venue[match.home][days[index]] = 'H';
    venue[match.away][days[index]] = 'A';
  });
  let total = 0;
  for (const row of venue) {
    for (let day = 1; day <= MATCHDAYS - 2; day++) {
      if (row[day] && row[day] === row[day + 1] && row[day] === row[day + 2]) total++;
    }
  }
  return total;
}

/**
 * Réduit les enchaînements de 3 matchs consécutifs au même lieu par échanges
 * de Kempe : dans le sous-graphe formé par deux journées a et b, chaque équipe
 * a exactement une rencontre de chaque journée. Ce sous-graphe est donc
 * 2-régulier, c'est-à-dire une union de cycles, et permuter a et b sur un cycle
 * entier laisse le calendrier valide. On conserve les permutations qui font
 * baisser le nombre de séries, ainsi que celles qui le laissent inchangé — ces
 * mouvements latéraux permettent de sortir des plateaux.
 */
function reduceStreaks(matches, days, teamCount, rng, { rounds = 1500 } = {}) {
  const current = days.slice();
  let score = countStreaks(matches, current, teamCount);
  let best = score;
  let bestDays = current.slice();

  for (let round = 0; round < rounds && best > 0; round++) {
    const a = 1 + Math.floor(rng() * MATCHDAYS);
    let b = 1 + Math.floor(rng() * MATCHDAYS);
    if (a === b) continue;

    // Sous-graphe des rencontres jouées lors des journées a ou b
    const adjacency = new Map();
    matches.forEach((match, index) => {
      if (current[index] !== a && current[index] !== b) return;
      for (const [from, to] of [[match.home, match.away], [match.away, match.home]]) {
        if (!adjacency.has(from)) adjacency.set(from, []);
        adjacency.get(from).push({ to, index });
      }
    });

    const seen = new Set();
    for (const start of adjacency.keys()) {
      for (const first of adjacency.get(start)) {
        if (seen.has(first.index)) continue;
        const component = [];
        let node = start;
        let step = first;
        while (step && !seen.has(step.index)) {
          seen.add(step.index);
          component.push(step.index);
          node = step.to;
          step = adjacency.get(node).find(next => !seen.has(next.index));
        }
        const flip = () => component.forEach(index => { current[index] = current[index] === a ? b : a; });
        flip();
        const candidate = countStreaks(matches, current, teamCount);
        if (candidate <= score) {
          score = candidate;
          if (candidate < best) {
            best = candidate;
            bestDays = current.slice();
          }
        } else {
          flip(); // annulation
        }
      }
    }
  }
  return bestDays;
}

/**
 * Répartit les matchs d'une journée sur ses dates et ses horaires officiels.
 */
function assignSlots(matchesOfDay, calendarEntry, rng) {
  const { dates, singleKickoff } = calendarEntry;
  const pool = shuffled(matchesOfDay, rng);
  const perDate = Math.ceil(pool.length / dates.length);
  const slots = [];

  dates.forEach((date, dateIndex) => {
    const chunk = pool.slice(dateIndex * perDate, (dateIndex + 1) * perDate);
    chunk.forEach((match, position) => {
      const kickoff = singleKickoff || (position < EARLY_PER_DAY ? EARLY_KICKOFF : LATE_KICKOFF);
      slots.push({ ...match, matchDate: date, kickoff });
    });
  });
  return slots;
}

/**
 * Vérifie le calendrier : 18 matchs par journée et une seule rencontre par
 * équipe et par journée.
 */
function validateSchedule(fixtures, teams) {
  const errors = [];
  const perDay = new Map();
  const perTeamDay = new Map();

  for (const fixture of fixtures) {
    perDay.set(fixture.matchday, (perDay.get(fixture.matchday) || 0) + 1);
    for (const team of [fixture.home, fixture.away]) {
      const key = `${team}:${fixture.matchday}`;
      if (perTeamDay.has(key)) {
        errors.push(`${teams[team].name} dispute deux matchs lors de la journée ${fixture.matchday}`);
      }
      perTeamDay.set(key, true);
    }
  }

  for (let day = 1; day <= MATCHDAYS; day++) {
    const count = perDay.get(day) || 0;
    if (count !== MATCHES_PER_MATCHDAY) {
      errors.push(`Journée ${day} : ${count} matchs au lieu de ${MATCHES_PER_MATCHDAY}`);
    }
  }
  return errors;
}

/**
 * Statistiques d'enchaînement domicile/extérieur (contrainte souple).
 */
function streakReport(fixtures, teams) {
  const venue = teams.map(() => new Array(MATCHDAYS + 1));
  for (const fixture of fixtures) {
    venue[fixture.home][fixture.matchday] = 'H';
    venue[fixture.away][fixture.matchday] = 'A';
  }
  const offenders = [];
  venue.forEach((row, index) => {
    for (let day = 1; day <= MATCHDAYS - 2; day++) {
      if (row[day] && row[day] === row[day + 1] && row[day] === row[day + 2]) {
        offenders.push({ team: teams[index].name, from: day, venue: row[day] });
        break;
      }
    }
  });
  return offenders;
}

/**
 * Construit le calendrier complet à partir des matchs tirés au sort.
 */
function buildSchedule(matches, teams, rng, { maxAttempts = 30 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let days;
    try {
      days = assignMatchdays(matches, teams.length, rng);
    } catch (error) {
      if (error.message === 'NODE_LIMIT') continue;
      throw error;
    }
    if (!days) continue;

    days = reduceStreaks(matches, days, teams.length, rng);
    const withDays = matches.map((match, index) => ({ ...match, matchday: days[index] }));
    const fixtures = [];
    for (const entry of CALENDAR) {
      const ofDay = withDays.filter(match => match.matchday === entry.matchday);
      fixtures.push(...assignSlots(ofDay, entry, rng));
    }

    const errors = validateSchedule(fixtures, teams);
    if (errors.length > 0) continue;

    fixtures.sort((x, y) =>
      x.matchday - y.matchday ||
      x.matchDate.localeCompare(y.matchDate) ||
      x.kickoff.localeCompare(y.kickoff) ||
      teams[x.home].seeding - teams[y.home].seeding
    );
    return { fixtures, attempts: attempt, streaks: streakReport(fixtures, teams) };
  }
  throw new Error(`Aucun calendrier valide trouvé après ${maxAttempts} tentatives`);
}

module.exports = {
  buildSchedule,
  assignMatchdays,
  validateSchedule,
  streakReport,
  reduceStreaks,
  CALENDAR,
  MATCHDAYS,
  MATCHES_PER_MATCHDAY,
};
