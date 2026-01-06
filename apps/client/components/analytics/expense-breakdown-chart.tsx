'use client'

import { useMemo, useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  getParentCategory,
  PARENT_CATEGORY_COLORS,
  PARENT_CATEGORIES,
} from '@/lib/category-utils'
import { useAnalytics } from '@/lib/analytics-context'

interface ParentCategoryData {
  parentCategory: string
  expense: number
}

const ExpenseBreakdownChart = () => {
  const { categoriesData, loading, error } = useAnalytics()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Memoize data to ensure stable reference for useMemo dependencies
  const data = useMemo(() => categoriesData || [], [categoriesData])

  // Group expenses by parent category
  const parentCategoryData = useMemo(() => {
    const parentMap = new Map<string, number>()

    // Initialize all parent categories with 0
    PARENT_CATEGORIES.forEach((parent) => {
      parentMap.set(parent, 0)
    })

    // Sum expenses by parent category
    data
      .filter((cat) => cat.expense > 0)
      .forEach((cat) => {
        const parent = getParentCategory(cat.categoryName)
        if (parent) {
          const current = parentMap.get(parent) || 0
          parentMap.set(parent, current + cat.expense)
        }
      })

    // Convert to array and filter out zero values
    const result: ParentCategoryData[] = Array.from(parentMap.entries())
      .map(([parentCategory, expense]) => ({
        parentCategory,
        expense,
      }))
      .filter((item) => item.expense > 0)
      .sort((a, b) => b.expense - a.expense)

    return result
  }, [data])

  // Create chart config for parent categories
  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    parentCategoryData.forEach((item) => {
      const key = item.parentCategory.toLowerCase().replace(/\s+/g, '-')
      const color = PARENT_CATEGORY_COLORS[item.parentCategory] || '#8884d8'
      config[key] = {
        label: item.parentCategory,
        color: color,
      }
    })
    return config
  }, [parentCategoryData])

  const chartData = useMemo(() => {
    return parentCategoryData.map((item) => {
      const key = item.parentCategory.toLowerCase().replace(/\s+/g, '-')
      const color = PARENT_CATEGORY_COLORS[item.parentCategory] || '#8884d8'
      return {
        name: item.parentCategory,
        value: item.expense,
        fill: color, // Use direct color value
        key: key, // Keep key for chartConfig
      }
    })
  }, [parentCategoryData])

  const totalExpenses = useMemo(() => {
    return parentCategoryData.reduce((sum, item) => sum + item.expense, 0)
  }, [parentCategoryData])

  if (loading) {
    return (
      <div className="neomorphic-card p-4 sm:p-6 animate-fade-in rounded-[var(--radius)] border-enhanced">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Expense Breakdown</h3>
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center neomorphic-card-inset p-4 rounded-lg">
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="neomorphic-card p-4 sm:p-6 animate-fade-in rounded-[var(--radius)] border-enhanced">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Expense Breakdown</h3>
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center neomorphic-card-inset p-4 rounded-lg">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (parentCategoryData.length === 0) {
    return (
      <div className="neomorphic-card p-4 sm:p-6 animate-fade-in rounded-[var(--radius)] border-enhanced">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Expense Breakdown</h3>
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center neomorphic-card-inset p-4 rounded-lg">
          <p className="text-muted-foreground font-medium">
            No expense data available
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="neomorphic-card p-4 sm:p-6 animate-slide-up rounded-[var(--radius)] border-enhanced">
      <h3 className="text-base sm:text-lg font-semibold mb-4">Expense Breakdown</h3>
      <ChartContainer config={chartConfig} className="min-h-[250px] sm:min-h-[300px] w-full neomorphic-card-inset p-4 rounded-lg">
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => {
                return isMobile ? `${(percent * 100).toFixed(0)}%` : `${name}: ${(percent * 100).toFixed(0)}%`;
              }}
              outerRadius={isMobile ? 80 : 100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="mt-4 text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
        Total Expenses:{' '}
        <span className="font-semibold text-foreground">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(totalExpenses)}
        </span>
      </div>
    </div>
  )
}

export default ExpenseBreakdownChart

