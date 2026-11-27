import type { ReactNode } from 'react'
import BrandMark from './BrandMark'

interface EndingFrameProps {
  kicker: string
  title: string
  children: ReactNode
  footer?: ReactNode
}

export default function EndingFrame({ kicker, title, children, footer }: EndingFrameProps) {
  return (
    <main className="ending-screen">
      <section className="ending-card" aria-labelledby="ending-title">
        <header className="ending-header">
          <BrandMark />
          <p className="ending-kicker">{kicker}</p>
        </header>
        <h1 id="ending-title" className="ending-title">
          {title}
        </h1>
        <div className="ending-body">{children}</div>
        {footer ? <footer className="ending-footer">{footer}</footer> : null}
      </section>
    </main>
  )
}
