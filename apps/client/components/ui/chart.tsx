"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: { CSS_SELECTOR: CSS_VARIABLE } }
const THEMES = { light: "", dark: ".dark" } as const

/**
 * Validate CSS color values to prevent CSS injection
 * Only allows safe CSS color formats: hex, rgb/rgba, hsl/hsla, or CSS color names
 */
function validateColorValue(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false
  }

  const trimmedColor = color.trim()

  // Allow hex colors: #rgb, #rrggbb, #rrggbbaa
  if (/^#[0-9a-f]{3,8}$/i.test(trimmedColor)) {
    return true
  }

  // Allow rgb/rgba: rgb(255,255,255) or rgba(255,255,255,0.5)
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i.test(trimmedColor)) {
    return true
  }

  // Allow hsl/hsla: hsl(120,100%,50%) or hsla(120,100%,50%,0.5)
  if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/i.test(trimmedColor)) {
    return true
  }

  // Allow CSS color names (common safe ones)
  const safeColorNames = [
    'transparent', 'currentcolor', 'inherit', 'initial', 'unset',
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
    'gray', 'grey', 'orange', 'purple', 'pink', 'brown', 'navy', 'teal',
    'lime', 'olive', 'maroon', 'silver', 'gold', 'aqua', 'fuchsia'
  ]
  if (safeColorNames.includes(trimmedColor.toLowerCase())) {
    return true
  }

  // Allow CSS variables: var(--color-name)
  if (/^var\(--[a-zA-Z0-9_-]+\)$/i.test(trimmedColor)) {
    return true
  }

  return false
}

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: { light: string; dark: string } }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.theme || itemConfig.color
  )

  if (!colorConfig.length) {
    return null
  }

  // Validate and sanitize color values before injection
  // Prevents CSS injection attacks if user-controlled data enters config
  // Runtime check: ensure config is never user-controlled
  if (process.env.NODE_ENV === 'production' && typeof config === 'object' && config !== null) {
    const configString = JSON.stringify(config);
    // Reject if config contains potentially dangerous patterns
    if (/javascript:|expression\(|url\(/gi.test(configString)) {
      console.error('[Chart] Potentially dangerous config detected, rejecting');
      return null;
    }
  }
  const sanitizedColorConfig = colorConfig
    .map(([key, itemConfig]) => {
      if (itemConfig?.theme) {
        // Validate theme colors
        const lightColor = itemConfig.theme.light
        const darkColor = itemConfig.theme.dark

        if (!validateColorValue(lightColor) || !validateColorValue(darkColor)) {
          console.warn(`[Chart] Invalid color value detected for key "${key}", skipping`)
          return null
        }

        return [key, itemConfig] as [string, ChartConfig[string]]
      }

      if (itemConfig?.color) {
        // Validate single color
        if (!validateColorValue(itemConfig.color)) {
          console.warn(`[Chart] Invalid color value detected for key "${key}", skipping`)
          return null
        }

        return [key, itemConfig] as [string, ChartConfig[string]]
      }

      return null
    })
    .filter((item): item is [string, ChartConfig[string]] => item !== null)

  if (!sanitizedColorConfig.length) {
    return null
  }

  // SECURITY FIX: Replace dangerouslySetInnerHTML with safer approach
  // Use React's built-in text node rendering which automatically escapes content
  const escapedId = id.replace(/[^a-zA-Z0-9_-]/g, '')

  // Generate CSS rules as a safe string
  const cssRules = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const escapedPrefix = prefix.replace(/[<>'"`]/g, '')

      const cssVars = sanitizedColorConfig
        .map(([key, itemConfig]): string | null => {
          const escapedKey = key.replace(/[^a-zA-Z0-9_-]/g, '')
          let color: string | undefined

          if (itemConfig?.theme) {
            color = itemConfig.theme[theme as keyof typeof itemConfig.theme]
          } else if (itemConfig?.color) {
            color = itemConfig.color
          }

          if (!color || !validateColorValue(color)) {
            return null
          }

          // Additional sanitization: ensure color is safe
          const safeColor = color.replace(/[<>'"`]/g, '')
          return `  --color-${escapedKey}: ${safeColor};`
        })
        .filter((item): item is string => item !== null)
        .join('\n')

      if (!cssVars) return null

      return `${escapedPrefix} [data-chart="${escapedId}"] {\n${cssVars}\n}`
    })
    .filter(Boolean)
    .join('\n\n')

  if (!cssRules) {
    return null
  }

  // SECURITY: Use React's text node children instead of dangerouslySetInnerHTML
  // React automatically escapes all text content, preventing XSS
  return <style suppressHydrationWarning>{cssRules}</style>
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const itemConfig = config[key as keyof typeof config]
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value as never, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-md",
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = config[key as keyof typeof config]
            const indicatorColor = color || item.payload.fill || item.color

            return (
              <div
                key={item.dataKey || index}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  nestLabel ? "items-center" : "items-baseline"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {nestLabel ? tooltipLabel : null}
                    {!hideIndicator && (
                      <div
                        className={cn(
                          "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                          {
                            "h-2.5 w-2.5": indicator === "dot",
                            "w-1": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent":
                              indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                          }
                        )}
                        style={
                          {
                            "--color-border": indicatorColor,
                            "--color-bg": indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-center" : "items-baseline"
                      )}
                    >
                      <div className="grid gap-1.5">
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                        {nestLabel && item.value && (
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {typeof item.value === "number"
                              ? item.value.toLocaleString()
                              : item.value}
                          </span>
                        )}
                      </div>
                      {!nestLabel && item.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : item.value}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = config[key as keyof typeof config]

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {!hideIcon && (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.icon && (
                <itemConfig.icon />
              )}
              {itemConfig?.label || item.value}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegendContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}

