// Vérification du moteur de tirage, sans base de données.
// Usage : node scripts/verify.js [nombre_de_tirages]
//
// Exécute N tirages complets et contrôle chaque condition du règlement, puis
// affiche des statistiques agrégées.

const { TEAMS } = require('../data/teams');
const { runDraw, validateDraw, createRng } = require('../services/drawEngine');
const { buildSchedule, validateSchedule } = require('../services/scheduleEngine');

const teams = TEAMS.map(team => ({ ...team, id: team.seeding }));
const count = Number(process.argv[2]) || 100;

let failures = 0;
let totalStreaks = 0;
let perfectSchedules = 0;
const opponentFrequency = new Map(); // vérifie que le tirage reste uniforme
const started = Date.now();

for (let seed = 1; seed <= count; seed++) {
  const draw = runDraw(teams, { seed });
  const schedule = buildSchedule(draw.matches, teams, createRng(seed ^ 0x9e3779b9));

  const errors = [
    ...validateDraw(draw.matches, teams),
    ...validateSchedule(schedule.fixtures, teams),
  ];

  if (errors.length > 0) {
    failures++;
    console.error(`Graine ${seed} — ${errors.length} violation(s) :`);
    errors.slice(0, 5).forEach(error => console.error(`  - ${error}`));
  }

  totalStreaks += schedule.streaks.length;
  if (schedule.streaks.length === 0) perfectSchedules++;

  for (const { home, away } of draw.matches) {
    const key = home < away ? `${home}:${away}` : `${away}:${home}`;
    opponentFrequency.set(key, (opponentFrequency.get(key) || 0) + 1);
  }
}

const elapsed = Date.now() - started;
const frequencies = [...opponentFrequency.values()];
const possiblePairs = teams.reduce((total, team, index) =>
  total + teams.slice(index + 1).filter(other => other.country !== team.country).length, 0);

console.log('');
console.log(`${count} tirages en ${elapsed} ms (${(elapsed / count).toFixed(1)} ms par tirage)`);
console.log(`Tirages conformes au règlement : ${count - failures} / ${count}`);
console.log('');
console.log('Calendrier');
console.log(`  Équipes enchaînant 3 matchs au même lieu : ${(totalStreaks / count).toFixed(2)} en moyenne`);
console.log(`  Calendriers sans aucun enchaînement : ${perfectSchedules} / ${count}`);
console.log('');
console.log('Uniformité du tirage');
console.log(`  Affiches possibles (associations différentes) : ${possiblePairs}`);
console.log(`  Affiches réellement sorties au moins une fois : ${frequencies.length}`);
console.log(`  Occurrences min / moy / max : ${Math.min(...frequencies)} / ` +
  `${(frequencies.reduce((a, b) => a + b, 0) / frequencies.length).toFixed(1)} / ${Math.max(...frequencies)}`);

process.exit(failures === 0 ? 0 : 1);
