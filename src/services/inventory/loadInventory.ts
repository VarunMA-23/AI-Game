import type { InventoryModel, StoreInventory } from '../../types/product'

const inventoryFiles = import.meta.glob<{ default: StoreInventory }>(
  '../../stores/*/inventory.json',
  { eager: true },
)

const emptyInventory = (storeId: string): StoreInventory => ({
  storeId,
  storeName: 'Store data unavailable',
  currency: 'INR',
  priceDate: null,
  models: [],
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const validModel = (value: unknown): value is InventoryModel => {
  if (!isRecord(value)) {
    return false
  }
  const npu = value.npu
  return (
    typeof value.code === 'string' &&
    typeof value.brand === 'string' &&
    typeof value.model === 'string' &&
    typeof value.processorFamily === 'string' &&
    typeof value.processorModel === 'string' &&
    isRecord(npu) &&
    typeof npu.available === 'boolean' &&
    (npu.classFromIntelSpec === null || typeof npu.classFromIntelSpec === 'string') &&
    (npu.tops === null || typeof npu.tops === 'number') &&
    typeof value.gpu === 'string' &&
    typeof value.ram === 'string' &&
    typeof value.storage === 'string' &&
    (value.batteryWh === null || typeof value.batteryWh === 'number') &&
    typeof value.displayNote === 'string' &&
    (value.warrantyMonths === null || typeof value.warrantyMonths === 'number') &&
    (value.price === null || typeof value.price === 'number') &&
    typeof value.inStock === 'boolean' &&
    Array.isArray(value.sourceUrls) &&
    value.sourceUrls.every((url) => typeof url === 'string') &&
    (value.lastVerified === null || typeof value.lastVerified === 'string') &&
    Array.isArray(value.aiFeatures) &&
    Array.isArray(value.supportedApplications)
  )
}

const validInventory = (value: unknown, storeId: string): value is StoreInventory =>
  isRecord(value) &&
  value.storeId === storeId &&
  typeof value.storeName === 'string' &&
  typeof value.currency === 'string' &&
  (value.priceDate === null || typeof value.priceDate === 'string') &&
  Array.isArray(value.models) &&
  value.models.every(validModel)

export const loadInventory = (storeId: string): StoreInventory => {
  const entry = Object.entries(inventoryFiles).find(([path]) =>
    path.endsWith(`/${storeId}/inventory.json`),
  )
  const inventory: unknown = entry?.[1]?.default

  if (!validInventory(inventory, storeId)) {
    return emptyInventory(storeId)
  }

  return inventory
}
