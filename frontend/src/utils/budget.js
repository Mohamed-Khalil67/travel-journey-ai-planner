/**
 * Strategy table: each travel style maps to allocation ratios that sum to exactly 1.
 * Adding a new style is a data change, not a code change.
 */
export const BUDGET_STRATEGIES = Object.freeze({
  balanced:  Object.freeze({ accommodation: 0.40, food: 0.30, activities: 0.20, transportation: 0.10 }),
  luxury:    Object.freeze({ accommodation: 0.55, food: 0.20, activities: 0.15, transportation: 0.10 }),
  adventure: Object.freeze({ accommodation: 0.20, food: 0.25, activities: 0.45, transportation: 0.10 })
});

/**
 * Splits a total budget across categories using the style's strategy.
 * The last category absorbs rounding so the parts always add up to the total.
 */
export function calculateBudget(totalBudget, styleStrategy = 'balanced') {
  const total = Math.max(0, Math.round(Number(totalBudget) || 0));
  const ratios = BUDGET_STRATEGIES[styleStrategy] ?? BUDGET_STRATEGIES.balanced;

  const accommodation = Math.round(total * ratios.accommodation);
  const food = Math.round(total * ratios.food);
  const activities = Math.round(total * ratios.activities);
  const transportation = total - accommodation - food - activities;

  return { total, accommodation, food, activities, transportation };
}
