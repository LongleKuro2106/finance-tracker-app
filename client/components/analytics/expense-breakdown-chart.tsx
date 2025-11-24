'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { apiGet } from '@/lib/api-client'

interface CategoryData {
  categoryId: number | null
  categoryName: string | null
  income: number
  expense: number
  total: number
}

interface ParentCategoryData {
  parentCategory: string
  expense: number
}

interface ExpenseBreakdownChartProps {
  refreshKey?: number
}

const ExpenseBreakdownChart = ({ refreshKey }: ExpenseBreakdownChartProps) => {
  const [data, setData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)
        const categoriesData = await apiGet<CategoryData[]>('/api/analytics/categories')
        setData(categoriesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories')
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [refreshKey])

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
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (parentCategoryData.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            No expense data available
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={100}
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
      <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        Total Expenses:{' '}
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(totalExpenses)}
      </div>
    </div>
  )
}

export default ExpenseBreakdownChart

