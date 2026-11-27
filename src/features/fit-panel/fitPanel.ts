import { intelSpecSource, verifiedNpuClass } from '../recommendations/verifiedSpecs'
import type { FitRow, InventoryModel } from '../../types/product'

export const FIT_CLOSING_LINE =
  'Compare the exact configuration, software support, warranty and price before you decide.'

const proofFor = (
  priority: string,
  model: InventoryModel,
  priceDate: string | null,
): string => {
  switch (priority) {
    case 'Battery capacity':
      return model.batteryWh ? `${model.batteryWh} Wh (staff-entered)` : 'Ask our team'
    case 'RAM':
      return model.ram ? model.ram : 'Ask our team'
    case 'Price':
      return model.price !== null
        ? `₹${model.price} (price date ${priceDate ?? 'Not shown'})`
        : 'Ask our team'
    case 'Storage':
      return model.storage ? model.storage : 'Ask our team'
    case 'NPU class':
      return verifiedNpuClass(model) ?? 'Ask our team'
    case 'Display':
      return model.displayNote ? model.displayNote : 'Ask our team'
    case 'GPU class':
      return model.gpu ? model.gpu : 'Ask our team'
    case 'Cooling note':
      return model.coolingNote ?? 'Ask our team'
    default:
      return 'Ask our team'
  }
}

export const buildFitRows = (
  priorities: string[],
  model: InventoryModel | null,
  priceDate: string | null,
): FitRow[] => {
  if (!model) {
    return priorities.map((priority) => ({
      priority,
      value: 'Ask our team',
      source: 'Ask our team',
    }))
  }

  return priorities.map((priority) => ({
    priority,
    value: proofFor(priority, model, priceDate),
    source:
      priority === 'NPU class'
        ? (intelSpecSource(model) ?? 'Ask our team')
        : (model.sourceUrls[0] ?? 'Ask our team'),
  }))
}
