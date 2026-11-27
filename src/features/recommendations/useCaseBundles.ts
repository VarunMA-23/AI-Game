import type { InventoryModel } from '../../types/product'

export type UseCaseBundleId = 'student' | 'creator' | 'remote-worker' | 'streamer'

export interface UseCaseBundle {
  id: UseCaseBundleId
  label: string
  budgetBand: string
  maxPrice: number
  pitch: string
  preferredCode: string
}

export const USE_CASE_BUNDLES: UseCaseBundle[] = [
  {
    id: 'student',
    label: 'Student',
    budgetBand: '₹55,000 – ₹75,000',
    maxPrice: 75000,
    pitch: 'A 15.6-inch FHD display, 16GB RAM and a 512GB SSD for notes, calls and everyday study.',
    preferredCode: 'REL-HP15-125H',
  },
  {
    id: 'remote-worker',
    label: 'Remote Worker',
    budgetBand: '₹75,000 – ₹1,00,000',
    maxPrice: 100000,
    pitch: '16GB RAM, a 1TB SSD, Intel Arc graphics and a 14-inch 3K OLED display for work on the move.',
    preferredCode: 'VIJ-HP-OB7',
  },
  {
    id: 'creator',
    label: 'Creator',
    budgetBand: '₹1,00,000 – ₹1,30,000',
    maxPrice: 130000,
    pitch: '16GB RAM, a 1TB SSD and a 14-inch OLED touch display for photo and video projects.',
    preferredCode: 'VIJ-ASUS-Z14-225H',
  },
  {
    id: 'streamer',
    label: 'Streamer',
    budgetBand: '₹1,30,000 – ₹1,45,000',
    maxPrice: 145000,
    pitch: 'Core Ultra 7 256V with Intel Arc 140V graphics and a 3K OLED touchscreen for games and streams.',
    preferredCode: 'VIJ-HP-XFLIP',
  },
]

export const pickModelForBundle = (
  models: InventoryModel[],
  bundle: UseCaseBundle,
): InventoryModel | null => {
  const inStock = models.filter((m) => m.inStock)
  return (
    inStock.find((m) => m.code === bundle.preferredCode) ??
    inStock.find((m) => m.price !== null && m.price <= bundle.maxPrice) ??
    inStock[0] ??
    null
  )
}

