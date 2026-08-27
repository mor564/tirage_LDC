const { loadTeams } = require('./drawService');

async function getAllTeams() {
  return loadTeams();
}

async function getTeamById(id) {
  const teams = await loadTeams();
  return teams.find(team => team.id === id);
}

/** Les 36 equipes regroupees par chapeau, dans l'ordre des bols du tirage. */
async function getTeamsByPot() {
  const teams = await loadTeams();
  return [1, 2, 3, 4].map(pot => ({ pot, teams: teams.filter(team => team.pot === pot) }));
}

module.exports = { getAllTeams, getTeamById, getTeamsByPot };
