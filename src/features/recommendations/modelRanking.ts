import type {
  InventoryModel,
  PersonaResult,
  RankedPicks,
} from '../../types/product'
import { isIntelSpecVerified } from './verifiedSpecs'

type RankingKey = PersonaResult['rankingKeys'][number]

const parseCapacity = (value: string): number => {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(GB|TB)/i)
  if (!match) {
    return 0
  }
  const amount = Number(match[1])
  return match[2].toUpperCase() === 'TB' ? amount * 1024 : amount
}

const gpuRank = (value: string): number => {
  const named = /arc|radeon|geforce|rtx|iris/i.test(value) ? 1000 : 0
  const number = Number(value.match(/\d+/)?.[0] ?? 0)
  return named + number
}

const numericValue = (model: InventoryModel, key: RankingKey): number => {
  switch (key) {
    case 'batteryWh':
      return model.batteryWh ?? 0
    case 'ram':
      return parseCapacity(model.ram)
    case 'storage':
      return parseCapacity(model.storage)
    case 'price':
      return model.price ?? Number.POSITIVE_INFINITY
    case 'npuClass':
      return isIntelSpecVerified(model) && model.npu.classFromIntelSpec ? 1 : 0
    case 'displayNote':
      return model.displayNote ? 1 : 0
    case 'gpu':
      return gpuRank(model.gpu)
    case 'coolingNote':
      return model.coolingNote ? 1 : 0
    default:
      return 0
  }
}

const compareBy = (left: InventoryModel, right: InventoryModel, key: RankingKey): number => {
  if (key === 'price') {
    const difference = numericValue(left, key) - numericValue(right, key)
    if (Number.isFinite(difference) && difference !== 0) {
      return difference
    }
  } else {
    const difference = numericValue(right, key) - numericValue(left, key)
    if (difference !== 0) {
      return difference
    }
  }
  return left.code.localeCompare(right.code)
}

export const rankModels = (
  inventory: InventoryModel[],
  persona: PersonaResult,
): RankedPicks => {
  const inStock = inventory.filter((model) => model.inStock)
  const ranked = [...inStock].sort((left, right) => {
    for (const key of persona.rankingKeys) {
      const result = compareBy(left, right, key)
      if (result !== 0) {
        return result
      }
    }
    return left.code.localeCompare(right.code)
  })

  const top = ranked[0] ?? null
  const cheapest =
    [...inStock].sort((left, right) =>
      compareBy(left, right, 'price'),
    )[0] ?? null
  const value =
    cheapest && cheapest.code !== top?.code
      ? cheapest
      : ranked.find((model) => model.code !== top?.code) ?? top
  const alternative =
    ranked.find(
      (model) => model.code !== top?.code && model.code !== value?.code,
    ) ?? null

  return { top, value, alternative, cheapest }
}
