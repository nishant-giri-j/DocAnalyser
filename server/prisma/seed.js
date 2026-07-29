const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database sequentially to respect Atlas connection limits...');

  // Create demo Company
  const company = await prisma.company.upsert({
    where: { name: 'Acme Corporation' },
    update: {},
    create: {
      name: 'Acme Corporation',
      industry: 'Technology',
      contactName: 'Admin User',
      contactEmail: 'admin@acmecorp.com',
    },
  });

  // Create demo Vendors sequentially
  const vendorData = [
    { name: 'TechFlow Solutions', email: 'contact@techflow.com', status: 'APPROVED', companyId: company.id },
    { name: 'Global Logistics Inc', email: 'support@globallogistics.com', status: 'PENDING_REVIEW', companyId: company.id },
    { name: 'Alpha Supplies', email: 'info@alphasupplies.com', status: 'FLAGGED', companyId: company.id }
  ];

  for (const data of vendorData) {
    try {
      await prisma.vendor.create({ data });
      console.log(`Created vendor: ${data.name}`);
    } catch (e) {
      console.log(`Vendor ${data.name} might already exist or failed: ${e.message}`);
    }
  }

  // Create demo Compliance Rules sequentially
  const ruleData = [
    { name: 'Valid W-9', category: 'Tax', field: 'hasValidW9', operator: 'EQUALS', value: 'true', severity: 'HIGH', companyId: company.id },
    { name: 'Minimum General Liability Coverage', category: 'Insurance', field: 'generalLiabilityAmount', operator: 'GREATER_THAN', value: '1000000', severity: 'CRITICAL', companyId: company.id },
    { name: 'Insurance Expiration Date', category: 'Insurance', field: 'insuranceExpirationDate', operator: 'AFTER_DATE', value: 'now', severity: 'HIGH', companyId: company.id },
    { name: 'Business License Validity', category: 'Legal', field: 'licenseStatus', operator: 'EQUALS', value: 'Active', severity: 'MEDIUM', companyId: company.id },
    { name: 'Workers Compensation Included', category: 'Insurance', field: 'hasWorkersComp', operator: 'EQUALS', value: 'true', severity: 'HIGH', companyId: company.id }
  ];

  for (const data of ruleData) {
    try {
      await prisma.complianceRule.create({ data });
      console.log(`Created rule: ${data.name}`);
    } catch (e) {
      console.log(`Rule ${data.name} might already exist or failed: ${e.message}`);
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
