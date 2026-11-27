import type { ReadinessResult, StoreInventory } from '../../types/product'

const parseDate = (value: string | null): Date | null => {
  if (!value) {
    return null
  }
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

const ageInDays = (date: Date, now: Date): number =>
  Math.max(0, (now.getTime() - date.getTime()) / 86_400_000)

export const checkStoreReadiness = (
  inventory: StoreInventory,
  now: Date = new Date(),
): ReadinessResult => {
  const reasons: string[] = []
  const priceDate = parseDate(inventory.priceDate)

  if (!priceDate || ageInDays(priceDate, now) > 90) {
    reasons.push('Store price date is missing or older than 90 days.')
  }

  const verifiedInStock = inventory.models.filter((model) => {
    if (!model.inStock) {
      return false
    }
    const verified = parseDate(model.lastVerified)
    return verified !== null && ageInDays(verified, now) <= 90
  })

  if (verifiedInStock.length < 2) {
    reasons.push('Fewer than two verified in-stock models are available.')
  }

  return {
    ready: reasons.length === 0,
    reasons,
    verifiedInStockCount: verifiedInStock.length,
  }
}
