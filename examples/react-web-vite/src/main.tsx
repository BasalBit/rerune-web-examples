import React from 'react'
import { ReRune } from '@rerune/react'
import ReactDOM from 'react-dom/client'

import { App } from './App'
import { clientReady } from './i18n'

const configuredTestVariant = import.meta.env.VITE_RERUNE_VARIANT?.trim()
const testVariant = configuredTestVariant && configuredTestVariant !== ReRune.Main ? configuredTestVariant : 'vip'

void clientReady.then(client => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App client={client} testVariant={testVariant} />
    </React.StrictMode>
  )
}).catch(error => {
  console.error('Localization startup failed', error)
  document.getElementById('root')!.textContent = 'Could not initialize translations.'
})
