const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const prisma = require('./config/db');

// Route imports
const vendorRoutes = require('./routes/vendorRoutes');
const documentRoutes = require('./routes/documentRoutes');
const complianceRoutes = require('./routes/complianceRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please try again later.' } },
});
app.use('/api', limiter);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'vendor-compliance-api',
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      service: 'vendor-compliance-api',
      database: 'disconnected',
    });
  }
});

// Dashboard aggregate endpoint
app.get('/api/dashboard', async (req, res, next) => {
  try {
    const [
      vendorCount,
      documentCount,
      vendorsByStatus,
      documentsByStatus,
      recentDocuments,
      recentVendors,
      avgRiskScore,
      complianceRuleCount,
    ] = await Promise.all([
      prisma.vendor.count(),
      prisma.document.count(),
      prisma.vendor.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.document.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { vendor: { select: { name: true } } },
      }),
      prisma.vendor.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { documents: true } } },
      }),
      prisma.document.aggregate({
        _avg: { riskScore: true },
        where: { status: 'COMPLETED', riskScore: { not: null } },
      }),
      prisma.complianceRule.count({ where: { isActive: true } }),
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalVendors: vendorCount,
          totalDocuments: documentCount,
          activeComplianceRules: complianceRuleCount,
          averageRiskScore: avgRiskScore._avg.riskScore || 0,
        },
        vendorsByStatus: vendorsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {}),
        documentsByStatus: documentsByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {}),
        recentDocuments,
        recentVendors,
      },
    });
  } catch (error) {
    next(error);
  }
});

// API Routes
app.use('/api/vendors', vendorRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/compliance', complianceRoutes);

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route ${req.method} ${req.originalUrl} not found` },
  });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads: ${path.join(__dirname, '..', 'uploads')}`);
});

module.exports = app;
