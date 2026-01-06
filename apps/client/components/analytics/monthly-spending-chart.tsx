'use client'

import { useMemo, useState, useEffect } from 'react'
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
      <div className="neomorphic-card p-4 sm:p-6 animate-fade-in rounded-[var(--radius)] border-enhanced">
        <h3 className="text-base sm:text-lg font-semibold mb-4">
          Daily Spending - {currentMonth}
        </h3>
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center neomorphic-card-inset p-4 rounded-lg">
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="neomorphic-card p-4 sm:p-6 animate-fade-in rounded-[var(--radius)] border-enhanced">
        <h3 className="text-base sm:text-lg font-semibold mb-4">
          Daily Spending - {currentMonth}
        </h3>
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center neomorphic-card-inset p-4 rounded-lg">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="neomorphic-card p-4 sm:p-6 animate-fade-in rounded-[var(--radius)] border-enhanced">
        <h3 className="text-base sm:text-lg font-semibold mb-4">
          Daily Spending - {currentMonth}
        </h3>
        <div className="h-[250px] sm:h-[300px] flex items-center justify-center neomorphic-card-inset p-4 rounded-lg">
          <p className="text-muted-foreground font-medium">
            No spending data available for this month
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="neomorphic-card p-4 sm:p-6 animate-slide-up rounded-[var(--radius)] border-enhanced">
      <h3 className="text-base sm:text-lg font-semibold mb-4">
        Daily Spending - {currentMonth}
      </h3>
      <ChartContainer config={chartConfig} className="min-h-[250px] sm:min-h-[300px] w-full neomorphic-card-inset p-4 rounded-lg">
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
          <LineChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(0)}`}
              width={isMobile ? 50 : 60}
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

