import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/geist'
import '@fontsource/instrument-serif'
import '@fontsource/instrument-serif/400-italic.css'
import './index.css'
import { Harness } from './harness/Harness'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
)
