'use client'

const AnalyticsPlaceholder = () => {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Placeholder cards for future analytics */}
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            Total Revenue
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            $0.00
          </p>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            Total Expenses
          </p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            $0.00
          </p>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            Net Balance
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            $0.00
          </p>
        </div>
      </div>
      {/* Placeholder for charts */}
      <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-8 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto text-neutral-400 dark:text-neutral-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-neutral-600 dark:text-neutral-400">
            Analytics charts will appear here
          </p>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPlaceholder

