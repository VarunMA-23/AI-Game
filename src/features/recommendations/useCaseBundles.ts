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
    budgetBand: '₹55,000 – ₹70,000',
    maxPrice: 70000,
    pitch: 'All-day lecture notes, local AI summaries, and light portability without breaking the budget.',
    preferredCode: 'CU-STU-58',
  },
  {
    id: 'remote-worker',
    label: 'Remote Worker',
    budgetBand: '₹70,000 – ₹85,000',
    maxPrice: 85000,
    pitch: 'Quiet video calls with NPU background blur, 76 Wh battery, and 1TB storage for work on the move.',
    preferredCode: 'CU-REM-76',
  },
  {
    id: 'creator',
    label: 'Creator',
    budgetBand: '₹85,000 – ₹1,20,000',
    maxPrice: 120000,
    pitch: 'Color-accurate OLED display plus dedicated NPU & Arc graphics for AI photo/video edits.',
    preferredCode: 'CU-CRE-94',
  },
  {
    id: 'streamer',
    label: 'Streamer',
    budgetBand: '₹1,20,000 – ₹1,45,000',
    maxPrice: 145000,
    pitch: 'Discrete RTX graphics for gameplay & encoding while the NPU offloads call blur and noise.',
    preferredCode: 'CU-STR-138',
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

