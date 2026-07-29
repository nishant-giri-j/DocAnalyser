const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  processDocument,
  updateDocument,
  deleteDocument,
  getDocumentStats,
} = require('../controllers/documentController');

// Stats must be before /:id to avoid route conflict
router.get('/stats/summary', getDocumentStats);

// CRUD routes
router.get('/', getAllDocuments);
router.get('/:id', getDocumentById);
router.post('/upload', upload.single('file'), uploadDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

// AI processing
router.post('/:id/process', processDocument);

module.exports = router;
