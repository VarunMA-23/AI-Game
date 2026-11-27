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
      <div className="ending-shell">
        <header className="ending-topbar">
          <BrandMark />
          <p className="ending-topbar-note">Offline retail demo · 180-second session</p>
        </header>
        <section className="ending-card" aria-labelledby="ending-title">
          <header className="ending-header">
            <div className="ending-kicker-row">
              <span className="ending-square" aria-hidden="true" />
              <p className="ending-kicker">{kicker}</p>
            </div>
            <h1 id="ending-title" className="ending-title">
              {title}
            </h1>
          </header>
          <div className="ending-body">{children}</div>
          {footer ? <footer className="ending-footer">{footer}</footer> : null}
        </section>
      </div>
    </main>
  )
}
