/**
 * Safe Array & Calculation Utilities
 * 
 * These utilities prevent common runtime errors when working with arrays and numeric operations.
 * They provide safe defaults and error handling for calculations.
 * 
 * Usage:
 * ```typescript
 * import { safeSum, safeMean, safeAccess } from '@/lib/safeCalc';
 * 
 * const total = safeSum(items, 'sent_count');
 * const average = safeMean(numbers);
 * const value = safeAccess(data, [0, 'nested', 'value'], 0);
 * ```
 */

/**
 * Safely sum a numeric property across array items
 * @param items - Array of objects
 * @param key - Property key to sum
 * @param defaultValue - Value to return if calculation fails
 * @returns Sum of all valid values, or defaultValue on error
 */
export function safeSum(
  items: any[] | null | undefined,
  key: string,
  defaultValue: number = 0
): number {
  try {
    if (!Array.isArray(items)) {
      console.debug(`safeSum: items is not an array, using default value: ${defaultValue}`);
      return defaultValue;
    }
    const result = items.reduce((sum: number, item: any) => {
      const value = item?.[key];
      const numValue = typeof value === 'number' ? value : 0;
      return sum + numValue;
    }, 0);
    return result;
  } catch (e) {
    console.error(`safeSum error for key "${key}":`, e);
    return defaultValue;
  }
}

/**
 * Safely count items matching a condition
 * @param items - Array of objects
 * @param predicate - Function to test each item
 * @param defaultValue - Value to return if calculation fails
 * @returns Count of matching items, or defaultValue on error
 */
export function safeCount(
  items: any[] | null | undefined,
  predicate: (item: any) => boolean,
  defaultValue: number = 0
): number {
  try {
    if (!Array.isArray(items)) {
      return defaultValue;
    }
    return items.filter(predicate).length;
  } catch (e) {
    console.error('safeCount error:', e);
    return defaultValue;
  }
}

/**
 * Safely calculate average of numeric values
 * @param values - Array of numbers
 * @param defaultValue - Value to return if calculation fails
 * @returns Average value, or defaultValue on error
 */
export function safeMean(
  values: number[] | null | undefined,
  defaultValue: number = 0
): number {
  try {
    if (!Array.isArray(values) || values.length === 0) {
      return defaultValue;
    }
    const sum = values.reduce((a: number, b: number) => a + (typeof b === 'number' ? b : 0), 0);
    return sum / values.length;
  } catch (e) {
    console.error('safeMean error:', e);
    return defaultValue;
  }
}

/**
 * Safely format number with locale string
 * @param value - Number to format
 * @param locale - Locale string (default: 'en-US')
 * @param defaultValue - String to return if formatting fails
 * @returns Formatted string, or defaultValue on error
 */
export function safeLocaleString(
  value: number | null | undefined,
  locale: string = 'en-US',
  defaultValue: string = '0'
): string {
  try {
    if (value === null || value === undefined || typeof value !== 'number') {
      return defaultValue;
    }
    return value.toLocaleString(locale);
  } catch (e) {
    console.error('safeLocaleString error:', e);
    return defaultValue;
  }
}

/**
 * Safely access nested property
 * @param obj - Object to access
 * @param keys - Array of keys for nested access
 * @param defaultValue - Value to return if access fails
 * @returns Property value or defaultValue
 * 
 * @example
 * safeAccess(data, ['user', 'address', 'city'], 'N/A')
 * // Equivalent to: data?.user?.address?.city ?? 'N/A'
 */
export function safeAccess(
  obj: any,
  keys: string[] | string,
  defaultValue: any = null
): any {
  try {
    if (obj === null || obj === undefined) {
      return defaultValue;
    }
    
    const keyArray = Array.isArray(keys) ? keys : [keys];
    let current = obj;
    
    for (const key of keyArray) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current ?? defaultValue;
  } catch (e) {
    console.error('safeAccess error:', e);
    return defaultValue;
  }
}

/**
 * Safely sort array by property
 * @param items - Array to sort
 * @param key - Property key to sort by
 * @param order - 'asc' or 'desc'
 * @param defaultValue - Array to return if sort fails
 * @returns Sorted array or defaultValue
 */
export function safeSort(
  items: any[] | null | undefined,
  key: string,
  order: 'asc' | 'desc' = 'asc',
  defaultValue: any[] = []
): any[] {
  try {
    if (!Array.isArray(items)) {
      return defaultValue;
    }
    const copy = [...items];
    copy.sort((a, b) => {
      const aVal = a?.[key] ?? 0;
      const bVal = b?.[key] ?? 0;
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return order === 'desc' ? -comparison : comparison;
    });
    return copy;
  } catch (e) {
    console.error('safeSort error:', e);
    return defaultValue;
  }
}

/**
 * Safely reduce array with error handling
 * @param items - Array to reduce
 * @param reducer - Reducer function
 * @param initialValue - Initial value
 * @param defaultValue - Value to return if reduce fails
 * @returns Result of reduce or defaultValue
 */
export function safeReduce(
  items: any[] | null | undefined,
  reducer: (acc: any, item: any, index: number) => any,
  initialValue: any,
  defaultValue: any = initialValue
): any {
  try {
    if (!Array.isArray(items)) {
      return defaultValue;
    }
    return items.reduce(reducer, initialValue);
  } catch (e) {
    console.error('safeReduce error:', e);
    return defaultValue;
  }
}

/**
 * Safely map array with error handling
 * @param items - Array to map
 * @param mapper - Mapping function
 * @param defaultValue - Array to return if map fails
 * @returns Mapped array or defaultValue
 */
export function safeMap(
  items: any[] | null | undefined,
  mapper: (item: any, index: number) => any,
  defaultValue: any[] = []
): any[] {
  try {
    if (!Array.isArray(items)) {
      return defaultValue;
    }
    return items.map(mapper);
  } catch (e) {
    console.error('safeMap error:', e);
    return defaultValue;
  }
}

/**
 * Calculate percentage safely
 * @param value - Current value
 * @param total - Total value
 * @param decimals - Number of decimal places (default: 1)
 * @param defaultValue - Value to return if calculation fails
 * @returns Percentage or defaultValue
 */
export function safePercent(
  value: number | null | undefined,
  total: number | null | undefined,
  decimals: number = 1,
  defaultValue: number = 0
): number {
  try {
    if (
      value === null ||
      value === undefined ||
      typeof value !== 'number' ||
      total === null ||
      total === undefined ||
      typeof total !== 'number' ||
      total === 0
    ) {
      return defaultValue;
    }
    const result = (value / total) * 100;
    return Math.round(result * Math.pow(10, decimals)) / Math.pow(10, decimals);
  } catch (e) {
    console.error('safePercent error:', e);
    return defaultValue;
  }
}

/**
 * Build array index safely
 * @param items - Array to index
 * @param index - Index to access
 * @param defaultValue - Value to return if index is out of bounds
 * @returns Item at index or defaultValue
 */
export function safeIndex(
  items: any[] | null | undefined,
  index: number,
  defaultValue: any = null
): any {
  try {
    if (!Array.isArray(items) || index < 0 || index >= items.length) {
      return defaultValue;
    }
    return items[index] ?? defaultValue;
  } catch (e) {
    console.error('safeIndex error:', e);
    return defaultValue;
  }
}

/**
 * Group array items by key
 * @param items - Array to group
 * @param key - Property key to group by
 * @param defaultValue - Object to return if grouping fails
 * @returns Object with grouped items or defaultValue
 */
export function safeGroupBy(
  items: any[] | null | undefined,
  key: string,
  defaultValue: Record<string, any> = {}
): Record<string, any> {
  try {
    if (!Array.isArray(items)) {
      return defaultValue;
    }
    return items.reduce((groups: Record<string, any>, item: any) => {
      const groupKey = item?.[key] ?? 'other';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {});
  } catch (e) {
    console.error('safeGroupBy error:', e);
    return defaultValue;
  }
}
