const { performDraw, getDraw, getLatestDraw, auditDraw } = require('../services/drawService');

/** POST /api/draw/perform — corps facultatif : { seed } pour rejouer un tirage. */
async function createDraw(req, res) {
  try {
    const { seed } = req.body || {};
    if (seed !== undefined && !Number.isInteger(Number(seed))) {
      return res.status(400).json({ error: 'La graine doit être un entier' });
    }
    const draw = await performDraw({ seed: seed === undefined ? undefined : Number(seed) });
    res.status(201).json(draw);
  } catch (error) {
    console.error('Erreur lors du tirage au sort :', error);
    res.status(500).json({ error: error.message });
  }
}

/** GET /api/draw/latest */
async function readLatestDraw(req, res) {
  try {
    const draw = await getLatestDraw();
    if (!draw) return res.status(404).json({ message: 'Aucun tirage effectué' });
    res.json(draw);
  } catch (error) {
    console.error('Erreur lors de la lecture du tirage :', error);
    res.status(500).json({ error: error.message });
  }
}

/** GET /api/draw/:id */
async function readDraw(req, res) {
  try {
    const draw = await getDraw(Number(req.params.id));
    if (!draw) return res.status(404).json({ message: 'Tirage introuvable' });
    res.json(draw);
  } catch (error) {
    console.error('Erreur lors de la lecture du tirage :', error);
    res.status(500).json({ error: error.message });
  }
}

/** GET /api/draw/audit et GET /api/draw/:id/audit — contrôle de conformité. */
async function readAudit(req, res) {
  try {
    const report = await auditDraw(req.params.id ? Number(req.params.id) : undefined);
    if (!report) return res.status(404).json({ message: 'Aucun tirage à auditer' });
    res.json(report);
  } catch (error) {
    console.error('Erreur lors de l\'audit :', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { createDraw, readLatestDraw, readDraw, readAudit };
