'use client'

import { useState, useRef, useEffect } from 'react'

// Category structure matching seed data
const CATEGORIES = [
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
]

interface CategorySelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const CategorySelector = ({
  value,
  onChange,
  disabled = false,
}: CategorySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [submenuPosition, setSubmenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSelect = (categoryName: string) => {
    onChange(categoryName)
    setIsOpen(false)
    setHoveredCategory(null)
    setSubmenuPosition(null)
  }

  const handleCategoryMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    categoryName: string,
  ) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    const category = CATEGORIES.find((cat) => cat.name === categoryName)
    if (category && category.children.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const submenuLeft = rect.right + 8 // 8px gap between menu and submenu
      const viewportWidth = window.innerWidth
      const submenuWidth = 200 // Estimated submenu width

      // Adjust position if submenu would go off-screen
      let finalLeft = submenuLeft
      if (submenuLeft + submenuWidth > viewportWidth - 16) {
        // Position on the left side if there's not enough space on the right
        finalLeft = rect.left - submenuWidth - 8
      }

      setHoveredCategory(categoryName)
      setSubmenuPosition({
        top: rect.top,
        left: finalLeft,
      })
    }
  }

  const handleCategoryMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCategory(null)
      setSubmenuPosition(null)
    }, 150) // Small delay to allow moving to submenu
  }

  const handleSubmenuMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
  }

  const handleSubmenuMouseLeave = () => {
    setHoveredCategory(null)
    setSubmenuPosition(null)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setHoveredCategory(null)
        setSubmenuPosition(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const selectedCategory = CATEGORIES.find((cat) => cat.name === value)
  const hoveredCategoryData = CATEGORIES.find(
    (cat) => cat.name === hoveredCategory,
  )

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none dark:bg-input/30 disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between"
      >
        <span className={value ? '' : 'text-neutral-500 dark:text-neutral-400'}>
          {value || 'None'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg max-h-80 overflow-y-auto">
            <div
              className="p-1 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-sm"
              onClick={() => handleSelect('')}
              onMouseEnter={handleCategoryMouseLeave}
            >
              <div className="px-2 py-1.5 text-sm">None</div>
            </div>
            {CATEGORIES.map((category) => (
              <div
                key={category.name}
                className="relative"
                onMouseEnter={(e) => handleCategoryMouseEnter(e, category.name)}
                onMouseLeave={handleCategoryMouseLeave}
              >
                <div
                  className={`p-1 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-sm ${
                    value === category.name
                      ? 'bg-neutral-100 dark:bg-neutral-800'
                      : ''
                  }`}
                  onClick={() => handleSelect(category.name)}
                >
                  <div className="px-2 py-1.5 text-sm font-medium flex items-center justify-between">
                    <span>{category.name}</span>
                    {category.children.length > 0 && (
                      <svg
                        className="w-4 h-4 text-neutral-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submenu for child categories */}
          {hoveredCategory &&
            hoveredCategoryData &&
            hoveredCategoryData.children.length > 0 &&
            submenuPosition && (
              <div
                className="fixed z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg min-w-[200px] max-h-80 overflow-y-auto"
                style={{
                  top: `${submenuPosition.top}px`,
                  left: `${submenuPosition.left}px`,
                }}
                onMouseEnter={handleSubmenuMouseEnter}
                onMouseLeave={handleSubmenuMouseLeave}
              >
                <div className="p-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 mb-1">
                    {hoveredCategoryData.name}
                  </div>
                  {hoveredCategoryData.children.map((child) => (
                    <div
                      key={child}
                      className={`p-1 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-sm ${
                        value === child
                          ? 'bg-neutral-100 dark:bg-neutral-800'
                          : ''
                      }`}
                      onClick={() => handleSelect(child)}
                    >
                      <div className="px-2 py-1.5 text-sm">{child}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </>
      )}
    </div>
  )
}

export default CategorySelector

