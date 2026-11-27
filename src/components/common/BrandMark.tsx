import { Cpu } from 'lucide-react'

interface BrandMarkProps {
  compact?: boolean
}

export default function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <Cpu size={compact ? 20 : 24} strokeWidth={2.2} />
      </span>
      <span className="brand-copy">
        <span className="brand-title">AI PC SHOWDOWN</span>
        {!compact && <span className="brand-subtitle">The 180-second upgrade</span>}
      </span>
    </div>
  )
}
