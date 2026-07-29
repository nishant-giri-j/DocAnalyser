const prisma = require('../config/db');

const getAllVendors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';
    const companyId = req.query.companyId;

    const skip = (page - 1) * limit;

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          company: {
            select: { name: true }
          },
          _count: {
            select: { documents: true }
          }
        }
      }),
      prisma.vendor.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        company: {
          select: { name: true }
        },
        documents: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { documents: true }
        }
      }
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.status(200).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

const createVendor = async (req, res, next) => {
  try {
    const { name, companyId, email, phone, address, status } = req.body;

    if (!name || !companyId) {
      return res.status(400).json({ success: false, message: 'Name and companyId are required' });
    }

    const companyExists = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!companyExists) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const newVendor = await prisma.vendor.create({
      data: {
        name,
        companyId,
        email,
        phone,
        address,
        status: status || 'PENDING_REVIEW'
      }
    });

    res.status(201).json({
      success: true,
      data: newVendor
    });
  } catch (error) {
    next(error);
  }
};

const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, status } = req.body;

    const existingVendor = await prisma.vendor.findUnique({ where: { id } });
    if (!existingVendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        status: status !== undefined ? status : undefined
      },
      include: {
        company: {
          select: { name: true }
        },
        _count: {
          select: { documents: true }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: updatedVendor
    });
  } catch (error) {
    next(error);
  }
};

const deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingVendor = await prisma.vendor.findUnique({ where: { id } });
    if (!existingVendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    await prisma.vendor.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getVendorStats = async (req, res, next) => {
  try {
    const statusCounts = await prisma.vendor.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const totalVendors = await prisma.vendor.count();

    const riskScoreAgg = await prisma.vendor.aggregate({
      _avg: {
        riskScore: true
      },
      where: {
        riskScore: {
          not: null
        }
      }
    });

    const recentVendors = await prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        company: {
          select: { name: true }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        statusCounts,
        totalVendors,
        averageRiskScore: riskScoreAgg._avg.riskScore || 0,
        recentVendors
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateVendorRiskScore = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        documents: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Example logic for risk score: sum of some field or just random for now if not specified.
    // Assuming documents might have a riskScore field or similar, or we calculate based on counts
    // For this implementation, we will just use 0 if no docs, or mock calculation.
    let totalRisk = 0;
    let docCount = vendor.documents.length;
    
    if (docCount > 0) {
      totalRisk = vendor.documents.reduce((acc, doc) => acc + (doc.riskScore || 0), 0);
      totalRisk = Math.round(totalRisk / docCount); 
    }
    // Alternatively, if the prompt doesn't specify document risk calculation, we just calculate an average.
    
    // Auto-update status based on risk
    let newStatus = vendor.status;
    if (totalRisk <= 30) {
      newStatus = 'APPROVED';
    } else if (totalRisk <= 60) {
      newStatus = 'PENDING_REVIEW';
    } else {
      newStatus = 'FLAGGED';
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        riskScore: totalRisk,
        status: newStatus
      },
      include: {
        company: { select: { name: true } }
      }
    });

    res.status(200).json({
      success: true,
      data: updatedVendor
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorStats,
  updateVendorRiskScore
};
