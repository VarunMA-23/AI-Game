import type { PersonaId } from './game'

export interface NpuInfo {
  available: boolean
  classFromIntelSpec: string | null
  tops: number | null
}

export interface InventoryModel {
  code: string
  brand: string
  model: string
  processorFamily: string
  processorModel: string
  npu: NpuInfo
  gpu: string
  ram: string
  storage: string
  batteryWh: number | null
  displayNote: string
  warrantyMonths: number | null
  price: number | null
  inStock: boolean
  sourceUrls: string[]
  lastVerified: string | null
  aiFeatures: string[]
  supportedApplications: string[]
  coolingNote?: string | null
}

export interface StoreInventory {
  storeId: string
  storeName: string
  currency: string
  priceDate: string | null
  models: InventoryModel[]
}

export interface ReadinessResult {
  ready: boolean
  reasons: string[]
  verifiedInStockCount: number
}

export interface PersonaDefinition {
  id: PersonaId
  name: string
  priorities: string[]
  rankingKeys: Array<'batteryWh' | 'ram' | 'price' | 'storage' | 'npuClass' | 'displayNote' | 'gpu' | 'coolingNote'>
}

export interface PersonaSignals {
  challengeScores: Record<string, number>
  challengeSubscores: Record<string, Record<string, number> | undefined>
  challengeStatus: Record<string, string>
}

export interface PersonaResult {
  persona: PersonaId
  priorities: string[]
  rankingKeys: PersonaDefinition['rankingKeys']
  primaryRaw: number
  note: string | null
  categoryScores: Record<string, number>
}

export interface RankedPicks {
  top: InventoryModel | null
  value: InventoryModel | null
  alternative: InventoryModel | null
  cheapest: InventoryModel | null
}

export interface ComparisonRow {
  label: string
  topValue: string
  valueValue: string
  plainLanguage: string
}

export interface FitRow {
  priority: string
  value: string
  source: string
}

export interface CompetitorFact {
  value: string
  sourceUrl: string
}

export interface CompetitorClass {
  id: string
  label: string
  npuNote: string
  npuSourceUrl: string
  comparisonFacts: {
    memory: CompetitorFact
    storage: CompetitorFact
    battery: CompetitorFact
    appSupport: CompetitorFact
  }
  strengths: Array<{ text: string; sourceUrl: string }>
  intelStrengths: Array<{ text: string; sourceUrl: string }>
  lastVerified: string
}

export interface HandoffRecord {
  storeId: string
  persona: PersonaId
  modelCode: string | null
  createdAt: number
}
