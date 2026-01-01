// Category structure matching seed data
export const PARENT_CATEGORIES = [
  'Food & Drinks',
  'Transport',
  'Shopping',
  'Leisure',
  'Health & Beauty',
  'Home Improvements',
  'Household & Services',
  'Other',
  'Saving',
] as const

export const CATEGORY_HIERARCHY: Record<string, string[]> = {
  'Food & Drinks': [
    'Groceries',
    'Restaurants',
    'Coffee & Snacks',
    'Alcohol & Tobacco',
    'Bars',
    'Food & Drinks Other',
  ],
  Transport: [
    'Car & Fuel',
    'Public Transport',
    'Flights',
    'Taxi',
    'Transport Other',
  ],
  Shopping: [
    'Clothes & Accessories',
    'Electronics',
    'Hobby & Sports Equipment',
    'Books & Games',
    'Gifts',
    'Shopping Other',
  ],
  Leisure: [
    'Culture & Events',
    'Hobbies',
    'Sports & Fitness',
    'Vacation',
    'Leisure Other',
  ],
  'Health & Beauty': [
    'Healthcare',
    'Pharmacy',
    'Eyecare',
    'Beauty',
    'Health & Beauty Other',
  ],
  'Home Improvements': [
    'Renovations & Repairs',
    'Furniture & Interior',
    'Garden',
    'Home Improvements Other',
  ],
  'Household & Services': [
    'Rent',
    'Mortgage & Interest',
    'Media & IT',
    'Utilities',
    'Insurances and Fees',
    'Services',
    'Household & Services Other',
  ],
  Other: [
    'Cash Withdrawals',
    'Business Expenses',
    'Kids',
    'Pets',
    'Charity',
    'Education',
    'Uncategorized',
    'Other',
  ],
  Saving: [],
}

// Map category name to its parent category
export const getParentCategory = (categoryName: string | null): string | null => {
  if (!categoryName) return null

  // Check if it's already a parent category
  if ((PARENT_CATEGORIES as readonly string[]).includes(categoryName)) {
    return categoryName
  }

  // Find parent category
  for (const [parent, children] of Object.entries(CATEGORY_HIERARCHY)) {
    if (children.includes(categoryName)) {
      return parent
    }
  }

  // If not found, return the category name itself (might be a parent without children)
  return categoryName
}

// Format category display: "parentCategory: smallCategory" or just "parentCategory"
export const formatCategoryDisplay = (
  categoryName: string | null,
): string | null => {
  if (!categoryName) return null

  const parent = getParentCategory(categoryName)

  // If it's a parent category, return as is
  if (parent === categoryName) {
    return categoryName
  }

  // If it's a child category, return "parent: child"
  return `${parent}: ${categoryName}`
}

// Format category display: "parentCategory: smallCategory" or just "parentCategory"
// Returns an object with parent and child for styling
export const formatCategoryDisplayParts = (
  categoryName: string | null,
): { parent: string; child: string | null } | null => {
  if (!categoryName) return null

  const parent = getParentCategory(categoryName)

  // If it's a parent category, return as is
  if (parent === categoryName) {
    return { parent: categoryName, child: null }
  }

  // If it's a child category, return parent and child
  return { parent: parent || categoryName, child: categoryName }
}

// Chart colors for parent categories - Light rainbow RGB colors
export const PARENT_CATEGORY_COLORS: Record<string, string> = {
  'Food & Drinks': '#FF6B6B', // Light red/coral
  Transport: '#4ECDC4', // Light turquoise/cyan
  Shopping: '#45B7D1', // Light blue
  Leisure: '#96CEB4', // Light green
  'Health & Beauty': '#FFEAA7', // Light yellow
  'Home Improvements': '#DDA15E', // Light orange
  'Household & Services': '#A29BFE', // Light purple
  Other: '#FD79A8', // Light pink
  Saving: '#6C5CE7', // Light indigo
}

