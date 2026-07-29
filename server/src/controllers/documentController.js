const prisma = require('../config/db');
const aiService = require('../services/aiService');
const path = require('path');
const fs = require('fs');

const getAllDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, documentType, vendorId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where = {};
    if (status) where.status = status;
    if (documentType) where.documentType = documentType;
    if (vendorId) where.vendorId = vendorId;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { vendor: { select: { name: true } } },
      }),
      prisma.document.count({ where }),
    ]);

    res.status(200).json({
      data: documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDocumentById = async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({ data: document });
  } catch (error) {
    next(error);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    const { vendorId, documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!vendorId || !documentType) {
      return res.status(400).json({ error: 'vendorId and documentType are required' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const document = await prisma.document.create({
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        documentType,
        status: 'UPLOADED',
        vendorId,
      },
    });

    res.status(201).json({ data: document });
  } catch (error) {
    next(error);
  }
};

const processDocument = async (req, res, next) => {
  try {
    const documentId = req.params.id;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { vendor: true },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const vendor = document.vendor;

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    try {
      const parseResult = await aiService.parseDocument(document.filePath, document.documentType);
      
      await prisma.document.update({
        where: { id: documentId },
        data: {
          parsedData: parseResult.parsedData || parseResult.parsed_data || {},
          extractedEntities: parseResult.extractedEntities || parseResult.entities || {},
          status: 'PARSED',
          processedAt: new Date(),
        },
      });

      const rules = await prisma.complianceRule.findMany({
        where: { 
          companyId: vendor.companyId,
          isActive: true
        }
      });

      const updatedDoc = await prisma.document.findUnique({ where: { id: documentId } });
      const complianceResult = await aiService.checkCompliance(updatedDoc.parsedData, rules);

      await prisma.document.update({
        where: { id: documentId },
        data: {
          riskScore: complianceResult.riskScore || complianceResult.risk_score || 0,
          riskFactors: complianceResult.riskFactors || complianceResult.violations || [],
          complianceNotes: complianceResult.complianceNotes || complianceResult.summary || '',
          status: 'COMPLETED',
        },
      });

    } catch (aiError) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          complianceNotes: aiError.message || 'Error processing document with AI service',
        },
      });
    }

    // Return the final document state
    const finalDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: { vendor: { select: { id: true, name: true, status: true } } },
    });

    res.status(200).json({ success: true, data: finalDocument });
  } catch (error) {
    next(error);
  }
};

const updateDocument = async (req, res, next) => {
  try {
    const { documentType, complianceNotes, status } = req.body;
    const documentId = req.params.id;

    const data = {};
    if (documentType !== undefined) data.documentType = documentType;
    if (complianceNotes !== undefined) data.complianceNotes = complianceNotes;
    if (status !== undefined) data.status = status;

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data,
    });

    res.status(200).json({ data: updatedDocument });
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const documentId = req.params.id;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.filePath) {
      fs.unlink(document.filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error(`Error deleting file ${document.filePath}:`, err);
        }
      });
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getDocumentStats = async (req, res, next) => {
  try {
    const [statusStats, typeStats, totalStats, riskStats] = await Promise.all([
      prisma.document.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.document.groupBy({
        by: ['documentType'],
        _count: { id: true },
      }),
      prisma.document.count(),
      prisma.document.aggregate({
        where: { status: 'COMPLETED', riskScore: { not: null } },
        _avg: { riskScore: true },
      }),
    ]);

    const statusCounts = statusStats.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {});

    const typeCounts = typeStats.reduce((acc, curr) => {
      acc[curr.documentType] = curr._count.id;
      return acc;
    }, {});

    res.status(200).json({
      data: {
        totalDocuments: totalStats,
        statusCounts,
        documentTypeCounts: typeCounts,
        averageRiskScore: riskStats._avg.riskScore || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDocuments,
  getDocumentById,
  uploadDocument,
  processDocument,
  updateDocument,
  deleteDocument,
  getDocumentStats,
};
