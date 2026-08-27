// Persistance des tirages. Deux implémentations interchangeables :
//  - MySQL, utilisée dès que la base est joignable ;
//  - mémoire, repli automatique qui permet de faire tourner l'application et
//    les tests sans serveur de base de données. Les tirages sont alors perdus
//    au redémarrage.

const db = require('./db');
const { TEAMS } = require('./data/teams');

const toDomainTeam = row => ({
  id: row.id,
  seeding: row.id,
  name: row.name,
  shortName: row.short_name,
  country: row.country,
  pot: row.pot,
});

const asIsoDate = value =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

// ---------------------------------------------------------------- MySQL

const mysqlRepository = {
  name: 'mysql',

  async getTeams() {
    const [rows] = await db.query('SELECT id, name, short_name, country, pot FROM teams ORDER BY id');
    return rows.map(toDomainTeam);
  },

  async getHistory() {
    const [rows] = await db.query('SELECT season, home_team_id, away_team_id FROM fixture_history');
    return rows.map(row => ({ season: row.season, homeId: row.home_team_id, awayId: row.away_team_id }));
  },

  async saveDraw({ seed, attempts, fixtures, reveals }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [inserted] = await connection.query(
        'INSERT INTO draws (seed, attempts) VALUES (?, ?)',
        [seed, attempts]
      );
      const drawId = inserted.insertId;

      await connection.query(
        'INSERT INTO draw_matches (draw_id, matchday, match_date, kickoff, home_team_id, away_team_id) VALUES ?',
        [fixtures.map(f => [drawId, f.matchday, f.matchDate, f.kickoff, f.homeId, f.awayId])]
      );
      await connection.query(
        'INSERT INTO draw_reveals (draw_id, step_order, pot, team_id, opponent_id, venue, already_known) VALUES ?',
        [reveals.map(r => [drawId, r.order, r.pot, r.teamId, r.opponentId, r.venue, r.alreadyKnown ? 1 : 0])]
      );

      await connection.commit();
      return drawId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getDraw(id) {
    const [[draw]] = await db.query('SELECT id, seed, attempts, created_at FROM draws WHERE id = ?', [id]);
    if (!draw) return null;

    const [fixtures] = await db.query(
      `SELECT matchday, match_date, kickoff, home_team_id, away_team_id
       FROM draw_matches WHERE draw_id = ? ORDER BY matchday, match_date, kickoff, home_team_id`,
      [id]
    );
    const [reveals] = await db.query(
      `SELECT step_order, pot, team_id, opponent_id, venue, already_known
       FROM draw_reveals WHERE draw_id = ? ORDER BY step_order, id`,
      [id]
    );

    return {
      id: draw.id,
      seed: Number(draw.seed),
      attempts: draw.attempts,
      createdAt: draw.created_at,
      fixtures: fixtures.map(row => ({
        matchday: row.matchday,
        matchDate: asIsoDate(row.match_date),
        kickoff: String(row.kickoff).slice(0, 5),
        homeId: row.home_team_id,
        awayId: row.away_team_id,
      })),
      reveals: reveals.map(row => ({
        order: row.step_order,
        pot: row.pot,
        teamId: row.team_id,
        opponentId: row.opponent_id,
        venue: row.venue,
        alreadyKnown: Boolean(row.already_known),
      })),
    };
  },

  async getLatestDrawId() {
    const [[latest]] = await db.query('SELECT id FROM draws ORDER BY id DESC LIMIT 1');
    return latest ? latest.id : null;
  },
};

// --------------------------------------------------------------- Mémoire

function createMemoryRepository() {
  const draws = new Map();
  let nextId = 1;

  return {
    name: 'memory',

    async getTeams() {
      return TEAMS.map(team => ({
        id: team.seeding,
        seeding: team.seeding,
        name: team.name,
        shortName: team.shortName,
        country: team.country,
        pot: team.pot,
      }));
    },

    async getHistory() {
      return [];
    },

    async saveDraw({ seed, attempts, fixtures, reveals }) {
      const id = nextId++;
      draws.set(id, { id, seed, attempts, createdAt: new Date(), fixtures, reveals });
      return id;
    },

    async getDraw(id) {
      return draws.get(id) || null;
    },

    async getLatestDrawId() {
      return draws.size === 0 ? null : Math.max(...draws.keys());
    },
  };
}

// ------------------------------------------------------------ Sélection

let repositoryPromise = null;

/**
 * Renvoie le dépôt MySQL si la base répond et contient les 36 équipes,
 * sinon le dépôt en mémoire. La détection n'a lieu qu'une fois.
 */
function getRepository() {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      try {
        const teams = await mysqlRepository.getTeams();
        if (teams.length === 36) return mysqlRepository;
        console.warn(
          `[repository] MySQL joignable mais ${teams.length} équipes en base — repli en mémoire. ` +
          'Lancez database/schema.sql puis `node database/seed.js`.'
        );
      } catch (error) {
        console.warn(`[repository] MySQL indisponible (${error.code || error.message}) — repli en mémoire.`);
      }
      return createMemoryRepository();
    })();
  }
  return repositoryPromise;
}

module.exports = { getRepository, mysqlRepository, createMemoryRepository };
