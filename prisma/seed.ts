import { PrismaClient, Role, AssetStatus, AssetCondition } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Computers & Laptops' },
      update: {},
      create: { name: 'Computers & Laptops', description: 'Desktop computers, laptops, and workstations', icon: 'laptop' },
    }),
    prisma.category.upsert({
      where: { name: 'Mobile Devices' },
      update: {},
      create: { name: 'Mobile Devices', description: 'Phones, tablets, and mobile equipment', icon: 'smartphone' },
    }),
    prisma.category.upsert({
      where: { name: 'Office Furniture' },
      update: {},
      create: { name: 'Office Furniture', description: 'Desks, chairs, and office furnishings', icon: 'chair' },
    }),
    prisma.category.upsert({
      where: { name: 'Printers & Scanners' },
      update: {},
      create: { name: 'Printers & Scanners', description: 'Printers, scanners, and imaging equipment', icon: 'printer' },
    }),
    prisma.category.upsert({
      where: { name: 'Networking Equipment' },
      update: {},
      create: { name: 'Networking Equipment', description: 'Routers, switches, and network hardware', icon: 'network' },
    }),
    prisma.category.upsert({
      where: { name: 'Software & Licenses' },
      update: {},
      create: { name: 'Software & Licenses', description: 'Software licenses and digital assets', icon: 'code' },
    }),
    prisma.category.upsert({
      where: { name: 'Audio/Visual Equipment' },
      update: {},
      create: { name: 'Audio/Visual Equipment', description: 'Monitors, projectors, and AV equipment', icon: 'monitor' },
    }),
    prisma.category.upsert({
      where: { name: 'Other Equipment' },
      update: {},
      create: { name: 'Other Equipment', description: 'Miscellaneous equipment and assets', icon: 'box' },
    }),
  ]);

  console.log(`Created ${categories.length} categories`);

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'IT' },
      update: {},
      create: { name: 'Information Technology', code: 'IT', description: 'IT Operations and Support' },
    }),
    prisma.department.upsert({
      where: { code: 'HR' },
      update: {},
      create: { name: 'Human Resources', code: 'HR', description: 'HR and People Operations' },
    }),
    prisma.department.upsert({
      where: { code: 'FIN' },
      update: {},
      create: { name: 'Finance', code: 'FIN', description: 'Finance and Accounting' },
    }),
    prisma.department.upsert({
      where: { code: 'MKT' },
      update: {},
      create: { name: 'Marketing', code: 'MKT', description: 'Marketing and Communications' },
    }),
    prisma.department.upsert({
      where: { code: 'SALES' },
      update: {},
      create: { name: 'Sales', code: 'SALES', description: 'Sales Operations' },
    }),
    prisma.department.upsert({
      where: { code: 'OPS' },
      update: {},
      create: { name: 'Operations', code: 'OPS', description: 'Operations and Logistics' },
    }),
  ]);

  console.log(`Created ${departments.length} departments`);

  // Create locations
  const itDept = departments.find(d => d.code === 'IT')!;
  
  // Helper to find or create location
  const findOrCreateLocation = async (data: { name: string; building?: string; floor?: string; room?: string; departmentId?: string }) => {
    const existing = await prisma.location.findFirst({
      where: { name: data.name, departmentId: data.departmentId || null }
    });
    if (existing) return existing;
    return prisma.location.create({ data });
  };
  
  const locations = await Promise.all([
    findOrCreateLocation({ name: 'IT Office - Floor 1', building: 'Main Building', floor: '1', room: '101', departmentId: itDept.id }),
    findOrCreateLocation({ name: 'Server Room', building: 'Main Building', floor: 'B1', room: 'B-101', departmentId: itDept.id }),
    findOrCreateLocation({ name: 'Main Office', building: 'Main Building', floor: '2', room: '201' }),
    findOrCreateLocation({ name: 'Conference Room A', building: 'Main Building', floor: '2', room: '202' }),
    findOrCreateLocation({ name: 'Open Workspace', building: 'Main Building', floor: '3', room: '301-320' }),
  ]);

  console.log(`Created ${locations.length} locations`);

  // Create vendors
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { name: 'Dell Technologies' },
      update: {},
      create: { name: 'Dell Technologies', contactName: 'John Smith', email: 'enterprise@dell.com', phone: '1-800-456-3355', website: 'dell.com' },
    }),
    prisma.vendor.upsert({
      where: { name: 'HP Inc.' },
      update: {},
      create: { name: 'HP Inc.', contactName: 'Sarah Johnson', email: 'business@hp.com', phone: '1-800-474-6836', website: 'hp.com' },
    }),
    prisma.vendor.upsert({
      where: { name: 'Lenovo' },
      update: {},
      create: { name: 'Lenovo', contactName: 'Mike Chen', email: 'enterprise@lenovo.com', phone: '1-855-253-6686', website: 'lenovo.com' },
    }),
    prisma.vendor.upsert({
      where: { name: 'Apple Inc.' },
      update: {},
      create: { name: 'Apple Inc.', contactName: 'Apple Business', email: 'business@apple.com', phone: '1-800-800-2775', website: 'apple.com' },
    }),
    prisma.vendor.upsert({
      where: { name: 'Microsoft' },
      update: {},
      create: { name: 'Microsoft', contactName: 'Enterprise Sales', email: 'enterprise@microsoft.com', phone: '1-800-642-7676', website: 'microsoft.com' },
    }),
  ]);

  console.log(`Created ${vendors.length} vendors`);

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { isPlatformAdmin: true },
    create: {
      name: 'System Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      isActive: true,
      isPlatformAdmin: true,
    },
  });

  const assetManager = await prisma.user.upsert({
    where: { email: 'asset.manager@example.com' },
    update: {},
    create: {
      name: 'Asset Manager',
      email: 'asset.manager@example.com',
      password: hashedPassword,
      role: Role.ASSET_MANAGER,
      departmentId: itDept.id,
      isActive: true,
    },
  });

  const deptManager = await prisma.user.upsert({
    where: { email: 'dept.manager@example.com' },
    update: {},
    create: {
      name: 'Department Manager',
      email: 'dept.manager@example.com',
      password: hashedPassword,
      role: Role.DEPARTMENT_MANAGER,
      departmentId: itDept.id,
      isActive: true,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: {},
    create: {
      name: 'John Employee',
      email: 'employee@example.com',
      password: hashedPassword,
      role: Role.EMPLOYEE,
      departmentId: itDept.id,
      isActive: true,
    },
  });

  console.log('Created users');

  // Create assets
  const computersCategory = categories.find(c => c.name === 'Computers & Laptops')!;
  const mobileCategory = categories.find(c => c.name === 'Mobile Devices')!;
  const networkingCategory = categories.find(c => c.name === 'Networking Equipment')!;
  const avCategory = categories.find(c => c.name === 'Audio/Visual Equipment')!;
  const mainOffice = locations.find(l => l.name === 'Main Office')!;
  const itOffice = locations.find(l => l.name === 'IT Office - Floor 1')!;
  const serverRoom = locations.find(l => l.name === 'Server Room')!;
  const dell = vendors.find(v => v.name === 'Dell Technologies')!;
  const hp = vendors.find(v => v.name === 'HP Inc.')!;
  const lenovo = vendors.find(v => v.name === 'Lenovo')!;

  const assets = await Promise.all([
    // Laptops
    prisma.asset.upsert({
      where: { assetTag: 'AST-001' },
      update: {},
      create: {
        assetTag: 'AST-001',
        name: 'Dell Latitude 5540',
        description: 'Business laptop for office use',
        serialNumber: 'DL5540-001',
        model: 'Latitude 5540',
        brand: 'Dell',
        status: AssetStatus.ASSIGNED,
        condition: AssetCondition.GOOD,
        categoryId: computersCategory.id,
        locationId: mainOffice.id,
        departmentId: itDept.id,
        assignedToId: employee.id,
        vendorId: dell.id,
        purchaseDate: new Date('2024-01-15'),
        purchaseCost: 1299.99,
        warrantyExpiry: new Date('2027-01-15'),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: 'AST-002' },
      update: {},
      create: {
        assetTag: 'AST-002',
        name: 'HP EliteBook 840 G10',
        description: 'Executive laptop',
        serialNumber: 'HP840G10-002',
        model: 'EliteBook 840 G10',
        brand: 'HP',
        status: AssetStatus.AVAILABLE,
        condition: AssetCondition.EXCELLENT,
        categoryId: computersCategory.id,
        locationId: mainOffice.id,
        departmentId: itDept.id,
        vendorId: hp.id,
        purchaseDate: new Date('2024-03-20'),
        purchaseCost: 1599.00,
        warrantyExpiry: new Date('2027-03-20'),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: 'AST-003' },
      update: {},
      create: {
        assetTag: 'AST-003',
        name: 'Lenovo ThinkPad X1 Carbon',
        description: 'Ultralight business laptop',
        serialNumber: 'LNX1C-003',
        model: 'ThinkPad X1 Carbon Gen 11',
        brand: 'Lenovo',
        status: AssetStatus.IN_REPAIR,
        condition: AssetCondition.NEEDS_REPAIR,
        categoryId: computersCategory.id,
        locationId: itOffice.id,
        departmentId: itDept.id,
        vendorId: lenovo.id,
        purchaseDate: new Date('2023-06-10'),
        purchaseCost: 1899.00,
        warrantyExpiry: new Date('2026-06-10'),
        notes: 'Keyboard replacement needed',
      },
    }),
    // Mobile devices
    prisma.asset.upsert({
      where: { assetTag: 'AST-004' },
      update: {},
      create: {
        assetTag: 'AST-004',
        name: 'iPhone 15 Pro',
        description: 'Company mobile phone',
        serialNumber: 'IP15P-004',
        model: 'iPhone 15 Pro',
        brand: 'Apple',
        status: AssetStatus.ASSIGNED,
        condition: AssetCondition.GOOD,
        categoryId: mobileCategory.id,
        locationId: mainOffice.id,
        departmentId: itDept.id,
        assignedToId: deptManager.id,
        vendorId: dell.id,
        purchaseDate: new Date('2024-02-01'),
        purchaseCost: 999.00,
        warrantyExpiry: new Date('2026-02-01'),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: 'AST-005' },
      update: {},
      create: {
        assetTag: 'AST-005',
        name: 'iPad Pro 12.9"',
        description: 'Demo tablet for sales',
        serialNumber: 'IPADP-005',
        model: 'iPad Pro 12.9" M2',
        brand: 'Apple',
        status: AssetStatus.AVAILABLE,
        condition: AssetCondition.EXCELLENT,
        categoryId: mobileCategory.id,
        purchaseDate: new Date('2024-04-15'),
        purchaseCost: 1099.00,
        warrantyExpiry: new Date('2026-04-15'),
      },
    }),
    // Networking
    prisma.asset.upsert({
      where: { assetTag: 'AST-006' },
      update: {},
      create: {
        assetTag: 'AST-006',
        name: 'Cisco Catalyst 2960-X Switch',
        description: '24-port managed switch',
        serialNumber: 'C2960X-006',
        model: 'Catalyst 2960-X-24PS-L',
        brand: 'Cisco',
        status: AssetStatus.ASSIGNED,
        condition: AssetCondition.GOOD,
        categoryId: networkingCategory.id,
        locationId: serverRoom.id,
        departmentId: itDept.id,
        vendorId: dell.id,
        purchaseDate: new Date('2022-11-20'),
        purchaseCost: 2499.00,
        warrantyExpiry: new Date('2027-11-20'),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: 'AST-007' },
      update: {},
      create: {
        assetTag: 'AST-007',
        name: 'Ubiquiti UniFi Dream Machine Pro',
        description: 'Enterprise router/firewall',
        serialNumber: 'UDM-PRO-007',
        model: 'UniFi Dream Machine Pro',
        brand: 'Ubiquiti',
        status: AssetStatus.ASSIGNED,
        condition: AssetCondition.EXCELLENT,
        categoryId: networkingCategory.id,
        locationId: serverRoom.id,
        departmentId: itDept.id,
        purchaseDate: new Date('2023-08-15'),
        purchaseCost: 379.00,
        warrantyExpiry: new Date('2025-08-15'),
      },
    }),
    // Monitors
    prisma.asset.upsert({
      where: { assetTag: 'AST-008' },
      update: {},
      create: {
        assetTag: 'AST-008',
        name: 'Dell UltraSharp U2723QE',
        description: '27" 4K USB-C Hub Monitor',
        serialNumber: 'DLU27-008',
        model: 'U2723QE',
        brand: 'Dell',
        status: AssetStatus.AVAILABLE,
        condition: AssetCondition.GOOD,
        categoryId: avCategory.id,
        locationId: mainOffice.id,
        departmentId: itDept.id,
        vendorId: dell.id,
        purchaseDate: new Date('2024-01-10'),
        purchaseCost: 619.99,
        warrantyExpiry: new Date('2027-01-10'),
      },
    }),
    prisma.asset.upsert({
      where: { assetTag: 'AST-009' },
      update: {},
      create: {
        assetTag: 'AST-009',
        name: 'Dell UltraSharp U2723QE',
        description: '27" 4K USB-C Hub Monitor',
        serialNumber: 'DLU27-009',
        model: 'U2723QE',
        brand: 'Dell',
        status: AssetStatus.ASSIGNED,
        condition: AssetCondition.EXCELLENT,
        categoryId: avCategory.id,
        locationId: mainOffice.id,
        departmentId: itDept.id,
        assignedToId: employee.id,
        vendorId: dell.id,
        purchaseDate: new Date('2024-01-10'),
        purchaseCost: 619.99,
        warrantyExpiry: new Date('2027-01-10'),
      },
    }),
    // Retired asset
    prisma.asset.upsert({
      where: { assetTag: 'AST-010' },
      update: {},
      create: {
        assetTag: 'AST-010',
        name: 'HP ProDesk 400 G3',
        description: 'Legacy desktop - retired',
        serialNumber: 'HPPD400-010',
        model: 'ProDesk 400 G3',
        brand: 'HP',
        status: AssetStatus.RETIRED,
        condition: AssetCondition.POOR,
        categoryId: computersCategory.id,
        locationId: itOffice.id,
        departmentId: itDept.id,
        vendorId: hp.id,
        purchaseDate: new Date('2018-03-15'),
        purchaseCost: 799.00,
        warrantyExpiry: new Date('2021-03-15'),
        notes: 'Retired due to hardware failure, pending disposal',
      },
    }),
  ]);

  console.log(`Created ${assets.length} assets`);

  // Create some audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'CREATE',
        entityType: 'Asset',
        entityId: assets[0].id,
        assetId: assets[0].id,
        userId: superAdmin.id,
        changes: { assetTag: 'AST-001', name: 'Dell Latitude 5540' },
        metadata: { source: 'seed' },
      },
      {
        action: 'ASSIGN',
        entityType: 'Asset',
        entityId: assets[0].id,
        assetId: assets[0].id,
        userId: superAdmin.id,
        changes: { assignedToId: employee.id },
        metadata: { assignedTo: 'John Employee' },
      },
      {
        action: 'CREATE',
        entityType: 'Asset',
        entityId: assets[1].id,
        assetId: assets[1].id,
        userId: assetManager.id,
        changes: { assetTag: 'AST-002', name: 'HP EliteBook 840 G10' },
        metadata: { source: 'seed' },
      },
    ],
  });

  console.log('Created audit logs');

  // Create maintenance records
  await prisma.maintenance.createMany({
    data: [
      {
        assetId: assets[2].id,
        type: 'REPAIR',
        description: 'Keyboard replacement - several keys not working',
        performedBy: assetManager.id,
        performedAt: new Date('2024-10-15'),
        cost: 150.00,
        status: 'IN_PROGRESS',
        notes: 'Awaiting keyboard replacement part',
      },
      {
        assetId: assets[0].id,
        type: 'UPDATES',
        description: 'OS update and security patches',
        performedBy: assetManager.id,
        performedAt: new Date('2024-09-01'),
        cost: 0,
        status: 'COMPLETED',
      },
    ],
  });

  console.log('Created maintenance records');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
