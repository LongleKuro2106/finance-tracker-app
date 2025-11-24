'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api-client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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

interface CumulativeSavingsChartProps {
  refreshKey?: number
}

const CumulativeSavingsChart = ({ refreshKey }: CumulativeSavingsChartProps) => {
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
    savings: {
      label: 'Cumulative Savings',
      color: '#45B7D1', // Light blue
    },
  } satisfies ChartConfig

  // Calculate cumulative savings
  let cumulativeSavings = 0
  const chartData = data.map((item) => {
    cumulativeSavings += item.savings
    const date = new Date(`${item.date}-01`)
    const monthName = date.toLocaleDateString('en-US', { month: 'short' })
    return {
      month: `${monthName} ${item.year}`,
      savings: cumulativeSavings,
    }
  })

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Cumulative Savings Trend</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Cumulative Savings Trend</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">Cumulative Savings Trend</h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            No savings data available
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4">Cumulative Savings Trend</h3>
      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} accessibilityLayer>
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
            <Line
              type="monotone"
              dataKey="savings"
              stroke="var(--color-savings)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

export default CumulativeSavingsChart

