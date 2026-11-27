import type { InventoryModel } from '../../types/product'

const INTEL_HOSTS = new Set(['intel.com', 'www.intel.com'])

const isIntelSpecUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    if (!INTEL_HOSTS.has(url.hostname.toLowerCase())) {
      return false
    }
    return (
      url.pathname.includes('/products/sku/') ||
      url.pathname.includes('/ark/product/') ||
      url.pathname.includes('/ark/products/')
    )
  } catch {
    return false
  }
}

export const isIntelSpecVerified = (model: InventoryModel): boolean =>
  model.sourceUrls.some(isIntelSpecUrl)

export const verifiedNpuClass = (model: InventoryModel): string | null =>
  isIntelSpecVerified(model) ? model.npu.classFromIntelSpec : null

export const intelSpecSource = (model: InventoryModel): string | null =>
  model.sourceUrls.find(isIntelSpecUrl) ?? null
