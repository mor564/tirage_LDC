const express = require('express');
const router = express.Router();
const { createDraw, readLatestDraw, readDraw, readAudit } = require('../controllers/drawController');

router.post('/perform', createDraw);
router.get('/latest', readLatestDraw);
router.get('/audit', readAudit);
router.get('/:id/audit', readAudit);
router.get('/:id', readDraw);

module.exports = router;
