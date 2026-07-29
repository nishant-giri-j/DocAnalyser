const express = require('express');
const router = express.Router();
const {
  getAllRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  bulkCreateRules,
  getRuleCategories,
  toggleRule,
} = require('../controllers/complianceController');

// Categories (before /rules/:id to avoid conflict)
router.get('/categories', getRuleCategories);

// Bulk operations (before /rules/:id to avoid conflict)
router.post('/rules/bulk', bulkCreateRules);

// CRUD routes for rules
router.get('/rules', getAllRules);
router.get('/rules/:id', getRuleById);
router.post('/rules', createRule);
router.put('/rules/:id', updateRule);
router.delete('/rules/:id', deleteRule);

// Toggle active status
router.patch('/rules/:id/toggle', toggleRule);

module.exports = router;
