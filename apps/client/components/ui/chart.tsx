'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

// Format: { THEME_NAME: { CSS_SELECTOR: CSS_VARIABLE } }
const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: { light: string; dark: string } }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >['children'];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <ChartStyle id={chartId} config={config}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line-line]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
            className,
          )}
          {...props}
        >
          <RechartsPrimitive.ResponsiveContainer>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartStyle>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'Chart';

/**
 * Validates CSS color value to prevent XSS via CSS injection
 * Only allows valid CSS color formats (hex, rgb, rgba, named colors)
 */
function isValidCssColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }

  // Remove whitespace
  const trimmed = color.trim();

  // Check for valid CSS color patterns
  // Hex colors: #rgb, #rrggbb, #rrggbbaa
  const hexPattern = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  // RGB/RGBA: rgb(...), rgba(...)
  const rgbPattern =
    /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i;
  // HSL/HSLA: hsl(...), hsla(...)
  const hslPattern =
    /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/i;
  // Named colors (basic set)
  const namedColors = [
    'transparent',
    'currentcolor',
    'inherit',
    'initial',
    'unset',
    'black',
    'white',
    'red',
    'green',
    'blue',
    'yellow',
    'cyan',
    'magenta',
    'gray',
    'grey',
    'orange',
    'purple',
    'pink',
    'brown',
  ];

  return (
    hexPattern.test(trimmed) ||
    rgbPattern.test(trimmed) ||
    hslPattern.test(trimmed) ||
    namedColors.includes(trimmed.toLowerCase())
  );
}

/**
 * Sanitizes chart ID to prevent XSS via attribute injection
 * Only allows alphanumeric, hyphens, and underscores
 */
function sanitizeChartId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Sanitizes CSS property key to prevent CSS injection
 * Only allows alphanumeric, hyphens, and underscores
 */
function sanitizeCssKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '');
}

const ChartStyle = ({
  id,
  config,
  children,
}: {
  id: string;
  config: ChartConfig;
  children: React.ReactNode;
}) => {
  // SECURITY: Sanitize chart ID to prevent XSS
  const sanitizedId = sanitizeChartId(id);
  const styleRef = React.useRef<HTMLStyleElement>(null);

  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.theme || itemConfig.color,
  );

  // SECURITY: Validate and sanitize all color values before use
  // This prevents XSS attacks via CSS injection even if config contains user input
  const validatedColorConfig = React.useMemo(() => {
    return colorConfig
      .map(([key, itemConfig]) => {
        const colors: { theme?: string; light?: string; dark?: string } = {};

        if (itemConfig?.theme) {
          const lightColor = itemConfig.theme.light;
          const darkColor = itemConfig.theme.dark;

          if (lightColor && isValidCssColor(lightColor)) {
            colors.light = lightColor;
          } else if (lightColor) {
            console.warn(
              `Invalid CSS color detected in chart config (light theme): ${lightColor}`,
            );
          }

          if (darkColor && isValidCssColor(darkColor)) {
            colors.dark = darkColor;
          } else if (darkColor) {
            console.warn(
              `Invalid CSS color detected in chart config (dark theme): ${darkColor}`,
            );
          }

          if (colors.light || colors.dark) {
            return { key, colors, isTheme: true };
          }
          return null;
        } else if (itemConfig?.color) {
          if (isValidCssColor(itemConfig.color)) {
            return { key, colors: { theme: itemConfig.color }, isTheme: false };
          } else {
            console.warn(
              `Invalid CSS color detected in chart config: ${itemConfig.color}`,
            );
            return null;
          }
        }

        return null;
      })
      .filter(
        (
          item,
        ): item is {
          key: string;
          colors: { theme?: string; light?: string; dark?: string };
          isTheme: boolean;
        } => item !== null,
      );
  }, [colorConfig]);

  // SECURITY: Build CSS rules using textContent instead of dangerouslySetInnerHTML
  // textContent is safe because it treats content as plain text, not HTML
  // All color values are validated before use
  const cssRules = React.useMemo(() => {
    if (!validatedColorConfig.length) {
      return '';
    }

    const rules: string[] = [];

    Object.entries(THEMES).forEach(([theme, prefix]) => {
      const themeRules: string[] = [];

      validatedColorConfig.forEach(({ key, colors, isTheme: isThemeColor }) => {
        const sanitizedKey = sanitizeCssKey(key);
        let colorValue: string | null = null;

        if (isThemeColor) {
          colorValue = theme === 'light' ? colors.light || null : colors.dark || null;
        } else {
          colorValue = colors.theme || null;
        }

        if (colorValue && isValidCssColor(colorValue)) {
          themeRules.push(`  --color-${sanitizedKey}: ${colorValue};`);
        }
      });

      if (themeRules.length > 0) {
        const selector = prefix
          ? `${prefix} [data-chart="${sanitizedId}"]`
          : `[data-chart="${sanitizedId}"]`;
        rules.push(`${selector} {\n${themeRules.join('\n')}\n}`);
      }
    });

    return rules.join('\n\n');
  }, [sanitizedId, validatedColorConfig]);

  // SECURITY: Use ref to set style content via textContent (safe, not HTML)
  // This eliminates XSS risk while maintaining theme support
  React.useEffect(() => {
    if (styleRef.current && cssRules) {
      styleRef.current.textContent = cssRules;
    }
  }, [cssRules]);

  if (!validatedColorConfig.length) {
    return <>{children}</>;
  }

  return (
    <>
      <style ref={styleRef} data-chart-style={sanitizedId} />
      {children}
    </>
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<'div'> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: 'line' | 'dot' | 'dashed';
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = 'dot',
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
    ref,
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item.dataKey || item.name || 'value'}`;
      const itemConfig = config[key as keyof typeof config];
      const value =
        !labelKey && typeof label === 'string'
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div className={cn('font-medium', labelClassName)}>
            {labelFormatter(value as never, payload)}
          </div>
        );
      }

      if (!value) {
        return null;
      }

      return <div className={cn('font-medium', labelClassName)}>{value}</div>;
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      config,
      labelKey,
    ]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== 'dot';

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-md',
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`;
            const itemConfig = config[key as keyof typeof config];
            const indicatorColor = color || item.payload.fill || item.color;

            return (
              <div
                key={item.dataKey || index}
                className={cn(
                  'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
                  nestLabel ? 'items-center' : 'items-baseline',
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
                          'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                          {
                            'h-2.5 w-2.5': indicator === 'dot',
                            'w-1': indicator === 'line',
                            'w-0 border-[1.5px] border-dashed bg-transparent':
                              indicator === 'dashed',
                            'my-0.5': nestLabel && indicator === 'dashed',
                          },
                        )}
                        style={
                          {
                            '--color-border': indicatorColor,
                            '--color-bg': indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )}
                    <div
                      className={cn(
                        'flex flex-1 justify-between leading-none',
                        nestLabel ? 'items-center' : 'items-baseline',
                      )}
                    >
                      <div className="grid gap-1.5">
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                        {nestLabel && item.value && (
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {typeof item.value === 'number'
                              ? item.value.toLocaleString()
                              : item.value}
                          </span>
                        )}
                      </div>
                      {!nestLabel && item.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {typeof item.value === 'number'
                            ? item.value.toLocaleString()
                            : item.value}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> &
    Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = 'bottom', nameKey },
    ref,
  ) => {
    const { config } = useChart();

    if (!payload?.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center gap-4',
          verticalAlign === 'top' ? 'pb-3' : 'pt-3',
          className,
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || 'value'}`;
          const itemConfig = config[key as keyof typeof config];

          return (
            <div
              key={item.value}
              className={cn(
                'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground',
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
              {itemConfig?.icon && <itemConfig.icon />}
              {itemConfig?.label || item.value}
            </div>
          );
        })}
      </div>
    );
  },
);
ChartLegendContent.displayName = 'ChartLegendContent';

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
