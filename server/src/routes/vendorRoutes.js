const express = require('express');
const router = express.Router();
const {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorStats,
  updateVendorRiskScore,
} = require('../controllers/vendorController');

// Stats must be before /:id to avoid route conflict
router.get('/stats/summary', getVendorStats);

// CRUD routes
router.get('/', getAllVendors);
router.get('/:id', getVendorById);
router.post('/', createVendor);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

// Risk score recalculation
router.patch('/:id/risk-score', updateVendorRiskScore);

module.exports = router;
