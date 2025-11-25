'use client'

import { useMemo } from 'react'
import { useAnalytics } from '@/lib/analytics-context'
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

const MonthlySpendingChart = () => {
  const { dailyData, loading, error } = useAnalytics()

  const chartConfig = {
    expense: {
      label: 'Daily Expenses',
      color: '#FF6B6B', // Light red/coral
    },
  } satisfies ChartConfig

  const chartData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return []

    return dailyData.map((item) => ({
      day: item.day,
      date: item.date,
      expense: item.expense,
    }))
  }, [dailyData])

  const currentMonth = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">
          Daily Spending - {currentMonth}
        </h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">
          Daily Spending - {currentMonth}
        </h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-lg font-semibold mb-4">
          Daily Spending - {currentMonth}
        </h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            No spending data available for this month
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4">
        Daily Spending - {currentMonth}
      </h3>
      <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Expense']}
                  labelFormatter={(label) => String(label)}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="var(--color-expense)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

export default MonthlySpendingChart

