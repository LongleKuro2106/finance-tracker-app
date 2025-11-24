'use client'

import AnalyticsOverview from '@/components/analytics/analytics-overview'
import ExpenseBreakdownChart from '@/components/analytics/expense-breakdown-chart'
import MonthlySpendingChart from '@/components/analytics/monthly-spending-chart'
import IncomeVsExpensesChart from '@/components/analytics/income-vs-expenses-chart'
import CumulativeSavingsChart from '@/components/analytics/cumulative-savings-chart'
import BudgetUsage from '@/components/analytics/budget-usage'

interface AnalyticsPlaceholderProps {
  refreshKey?: number
}

const AnalyticsPlaceholder = ({ refreshKey }: AnalyticsPlaceholderProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Analytics Overview</h2>
        <AnalyticsOverview refreshKey={refreshKey} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseBreakdownChart refreshKey={refreshKey} />
        <MonthlySpendingChart refreshKey={refreshKey} />
        <IncomeVsExpensesChart refreshKey={refreshKey} />
        <CumulativeSavingsChart refreshKey={refreshKey} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetUsage refreshKey={refreshKey} />
      </div>
    </div>
  )
}

export default AnalyticsPlaceholder

