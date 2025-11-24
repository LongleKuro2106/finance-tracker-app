'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api-client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface MonthlyData {
  month: number
  year: number
  date: string
  income: number
  expense: number
  savings: number
}

interface IncomeVsExpensesChartProps {
  refreshKey?: number
}

const IncomeVsExpensesChart = ({ refreshKey }: IncomeVsExpensesChartProps) => {
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMonthly = async () => {
      try {
        setLoading(true)
        setError(null)
        const monthlyData = await apiGet<MonthlyData[]>('/api/analytics/monthly?months=12')
        setData(monthlyData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load monthly data')
      } finally {
        setLoading(false)
      }
    }

    fetchMonthly()
  }, [refreshKey])

  const chartConfig = {
    income: {
      label: 'Income',
      color: '#4ECDC4', // Light turquoise
    },
    expense: {
      label: 'Expenses',
      color: '#FF6B6B', // Light red/coral
    },
  } satisfies ChartConfig

  const chartData = data.map((item) => {
    const date = new Date(`${item.date}-01`)
    const monthName = date.toLocaleDateString('en-US', { month: 'short' })
    return {
      month: `${monthName} ${item.year}`,
      income: item.income,
      expense: item.expense,
    }
  })

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Income vs Expenses</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Income vs Expenses</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Income vs Expenses</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            No data available
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4">Income vs Expenses</h3>
      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

export default IncomeVsExpensesChart

