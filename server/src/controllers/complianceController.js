const prisma = require('../config/db');

const getAllRules = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { companyId, category, severity, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    const totalRules = await prisma.complianceRule.count({ where });
    const rules = await prisma.complianceRule.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        company: {
          select: { name: true, id: true }
        }
      }
    });

    res.status(200).json({
      data: rules,
      pagination: {
        total: totalRules,
        page,
        limit,
        totalPages: Math.ceil(totalRules / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRuleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await prisma.complianceRule.findUnique({
      where: { id },
      include: {
        company: {
          select: { name: true, id: true }
        }
      }
    });

    if (!rule) {
      return res.status(404).json({ message: 'Compliance rule not found' });
    }

    res.status(200).json(rule);
  } catch (error) {
    next(error);
  }
};

const createRule = async (req, res, next) => {
  try {
    const { name, category, field, operator, value, companyId, description, severity, isActive } = req.body;

    if (!name || !category || !field || !operator || value === undefined || !companyId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const companyExists = await prisma.company.findUnique({ where: { id: companyId } });
    if (!companyExists) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const newRule = await prisma.complianceRule.create({
      data: {
        name,
        category,
        field,
        operator,
        value,
        companyId,
        description,
        severity,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.status(201).json(newRule);
  } catch (error) {
    next(error);
  }
};

const updateRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const rule = await prisma.complianceRule.update({
      where: { id },
      data,
      include: {
        company: {
          select: { name: true, id: true }
        }
      }
    });

    res.status(200).json(rule);
  } catch (error) {
    next(error);
  }
};

const deleteRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.complianceRule.delete({ where: { id } });
    res.status(200).json({ message: 'Compliance rule deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const bulkCreateRules = async (req, res, next) => {
  try {
    const { rules } = req.body;
    
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty rules array' });
    }

    const companyIds = [...new Set(rules.map(r => r.companyId))];
    const existingCompanies = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true }
    });
    
    if (existingCompanies.length !== companyIds.length) {
      return res.status(404).json({ message: 'One or more companies not found' });
    }

    const created = await prisma.complianceRule.createMany({
      data: rules
    });

    res.status(201).json({ message: 'Rules created successfully', count: created.count });
  } catch (error) {
    next(error);
  }
};

const getRuleCategories = async (req, res, next) => {
  try {
    const categories = await prisma.complianceRule.findMany({
      select: { category: true },
      distinct: ['category']
    });

    res.status(200).json(categories.map(c => c.category));
  } catch (error) {
    next(error);
  }
};

const toggleRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await prisma.complianceRule.findUnique({ where: { id } });
    
    if (!rule) {
      return res.status(404).json({ message: 'Compliance rule not found' });
    }

    const updatedRule = await prisma.complianceRule.update({
      where: { id },
      data: { isActive: !rule.isActive }
    });

    res.status(200).json(updatedRule);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  bulkCreateRules,
  getRuleCategories,
  toggleRule
};
