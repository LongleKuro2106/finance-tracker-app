import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: 'Food & Drinks',
    children: [
      'Groceries',
      'Restaurants',
      'Coffee & Snacks',
      'Alcohol & Tobacco',
      'Bars',
      'Food & Drinks Other',
    ],
  },
  {
    name: 'Transport',
    children: [
      'Car & Fuel',
      'Public Transport',
      'Flights',
      'Taxi',
      'Transport Other',
    ],
  },
  {
    name: 'Shopping',
    children: [
      'Clothes & Accessories',
      'Electronics',
      'Hobby & Sports Equipment',
      'Books & Games',
      'Gifts',
      'Shopping Other',
    ],
  },
  {
    name: 'Leisure',
    children: [
      'Culture & Events',
      'Hobbies',
      'Sports & Fitness',
      'Vacation',
      'Leisure Other',
    ],
  },
  {
    name: 'Health & Beauty',
    children: [
      'Healthcare',
      'Pharmacy',
      'Eyecare',
      'Beauty',
      'Health & Beauty Other',
    ],
  },
  {
    name: 'Home Improvements',
    children: [
      'Renovations & Repairs',
      'Furniture & Interior',
      'Garden',
      'Home Improvements Other',
    ],
  },
  {
    name: 'Household & Services',
    children: [
      'Rent',
      'Mortgage & Interest',
      'Media & IT',
      'Utilities',
      'Insurances and Fees',
      'Services',
      'Household & Services Other',
    ],
  },
  {
    name: 'Other',
    children: [
      'Cash Withdrawals',
      'Business Expenses',
      'Kids',
      'Pets',
      'Charity',
      'Education',
      'Uncategorized',
      'Other',
    ],
  },
  {
    name: 'Saving',
    children: [],
  },
];

async function main() {
  console.log('Starting category seed...');

  // Clear existing categories
  await prisma.category.deleteMany({});

  // Create parent categories and their children
  for (const category of categories) {
    const parent = await prisma.category.create({
      data: {
        name: category.name,
      },
    });

    console.log(`Created parent category: ${category.name}`);

    // Create child categories
    for (const childName of category.children) {
      await prisma.category.create({
        data: {
          name: childName,
          parentId: parent.id,
        },
      });
      console.log(`  Created child category: ${childName}`);
    }
  }

  console.log('Category seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
