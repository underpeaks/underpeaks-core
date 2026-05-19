/**
 * cn.ts  (commonly named utils.ts or lib/utils.ts in Next.js projects)
 *
 * A single utility function `cn` for merging Tailwind CSS class names safely
 * and intelligently.
 *
 * Why this file exists:
 *   In React components you often need to combine class names conditionally,
 *   for example:
 *     <div className={`base-style ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`}>
 *
 *   This gets messy quickly, and Tailwind has a specific problem on top: if
 *   you apply two conflicting utility classes (e.g. 'p-2' and 'p-4'), both
 *   end up in the final class string but only one takes effect — and which
 *   one "wins" is determined by stylesheet order, not the order you wrote
 *   them. That can cause subtle, hard-to-debug styling bugs.
 *
 *   The `cn` function solves both problems:
 *     1. clsx    — cleanly merges any combination of strings, arrays,
 *                  objects, and conditionals into a single class string,
 *                  filtering out falsy values (false, null, undefined).
 *     2. twMerge — takes that merged string and resolves any conflicting
 *                  Tailwind classes so that the last one always wins,
 *                  regardless of stylesheet order.
 *
 * Libraries used:
 *   clsx           — https://github.com/lukeed/clsx
 *                    Lightweight utility for constructing class strings.
 *   tailwind-merge — https://github.com/dcastil/tailwind-merge
 *                    Tailwind-aware class merging that removes conflicts.
 *
 * Exports:
 *   cn(...inputs) — accepts any number of class values and returns a single
 *                   clean, conflict-free class string.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge }               from 'tailwind-merge'

/**
 * cn  (short for "class names")
 *
 * Merges any number of Tailwind class name inputs into a single string,
 * handling conditionals cleanly and resolving Tailwind conflicts so the
 * last class always wins.
 *
 * Accepts the same input shapes as clsx:
 *   - Strings       cn('px-4', 'py-2')
 *   - Conditionals  cn('base', isActive && 'bg-blue-500')
 *   - Objects       cn({ 'opacity-50': isDisabled, 'cursor-not-allowed': isDisabled })
 *   - Arrays        cn(['text-sm', 'font-medium'])
 *   - Mixed         cn('base', isActive && 'bg-blue-500', { 'ring-2': isFocused })
 *
 * Tailwind conflict resolution examples:
 *   cn('p-2', 'p-4')                    → 'p-4'          (p-2 removed, last wins)
 *   cn('text-red-500', 'text-blue-500') → 'text-blue-500'
 *   cn('px-2', 'px-4', 'py-3')         → 'px-4 py-3'
 *
 * @param {...ClassValue[]} inputs - Any number of class values in any shape
 *                                   supported by clsx (strings, booleans,
 *                                   objects, arrays, or null/undefined which
 *                                   are safely ignored).
 * @returns {string} A single, clean class name string with Tailwind conflicts
 *                   resolved, ready to be passed to a `className` prop.
 *
 * @example
 *   // Basic conditional class
 *   <button className={cn('rounded px-4 py-2', isActive && 'bg-blue-500')}>
 *
 * @example
 *   // Conflict resolution — component base vs caller override
 *   function Card({ className }: { className?: string }) {
 *     return <div className={cn('rounded-lg p-4 bg-white', className)} />
 *   }
 *   // Caller can safely override: <Card className="p-8" /> → 'rounded-lg bg-white p-8'
 *   // Without twMerge it would be: 'rounded-lg p-4 bg-white p-8' (both p-4 and p-8 present)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}