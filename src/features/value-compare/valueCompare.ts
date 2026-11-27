import { verifiedNpuClass } from '../recommendations/verifiedSpecs'
import type { ComparisonRow, InventoryModel } from '../../types/product'

const shown = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? 'Not shown' : String(value)

const numberFrom = (value: string | number | null): number =>
  typeof value === 'number'
    ? value
    : Number(value?.match(/\d+(?:\.\d+)?/)?.[0] ?? 0)

const plainDifference = (
  label: string,
  top: string,
  value: string,
  topNumber: number,
  valueNumber: number,
  higherIsBetter: boolean,
): string => {
  if (top === 'Not shown' || value === 'Not shown' || topNumber === valueNumber) {
    return `${label}: compare the exact specification before you decide.`
  }
  const higher = higherIsBetter ? topNumber > valueNumber : topNumber < valueNumber
  const direction = higher ? 'Top pick' : 'Value pick'
  return `${direction} has the stronger ${label.toLowerCase()} figure. Compare the exact configuration before you decide.`
}

export const buildComparisonRows = (
  top: InventoryModel | null,
  value: InventoryModel | null,
): ComparisonRow[] => {
  if (!top || !value) {
    return []
  }

  const batteryTop = shown(top.batteryWh)
  const batteryValue = shown(value.batteryWh)
  const warrantyTop = shown(top.warrantyMonths)
  const warrantyValue = shown(value.warrantyMonths)
  const npuTop = shown(verifiedNpuClass(top))
  const npuValue = shown(verifiedNpuClass(value))

  return [
    {
      label: 'RAM',
      topValue: shown(top.ram),
      valueValue: shown(value.ram),
      plainLanguage: plainDifference(
        'RAM',
        shown(top.ram),
        shown(value.ram),
        numberFrom(top.ram),
        numberFrom(value.ram),
        true,
      ),
    },
    {
      label: 'Storage',
      topValue: shown(top.storage),
      valueValue: shown(value.storage),
      plainLanguage: plainDifference(
        'Storage',
        shown(top.storage),
        shown(value.storage),
        numberFrom(top.storage),
        numberFrom(value.storage),
        true,
      ),
    },
    {
      label: 'Battery capacity',
      topValue: batteryTop === 'Not shown' ? 'Not shown' : `${batteryTop} Wh`,
      valueValue: batteryValue === 'Not shown' ? 'Not shown' : `${batteryValue} Wh`,
      plainLanguage: plainDifference(
        'Battery capacity',
        batteryTop,
        batteryValue,
        numberFrom(top.batteryWh),
        numberFrom(value.batteryWh),
        true,
      ),
    },
    {
      label: 'NPU class',
      topValue: npuTop,
      valueValue: npuValue,
      plainLanguage:
        npuTop === 'Not shown' || npuValue === 'Not shown'
          ? 'Ask our team for the verified NPU class.'
          : 'Compare the verified NPU class and the apps you use.',
    },
    {
      label: 'GPU',
      topValue: shown(top.gpu),
      valueValue: shown(value.gpu),
      plainLanguage: 'Compare the exact GPU configuration.',
    },
    {
      label: 'Warranty',
      topValue: warrantyTop === 'Not shown' ? 'Not shown' : `${warrantyTop} months`,
      valueValue: warrantyValue === 'Not shown' ? 'Not shown' : `${warrantyValue} months`,
      plainLanguage: plainDifference(
        'Warranty',
        warrantyTop,
        warrantyValue,
        numberFrom(top.warrantyMonths),
        numberFrom(value.warrantyMonths),
        true,
      ),
    },
  ]
}
