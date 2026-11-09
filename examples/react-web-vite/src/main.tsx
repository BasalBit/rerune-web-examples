import React from 'react'
import { ReRune } from '@rerune/react'
import ReactDOM from 'react-dom/client'

import { App } from './App'
import { client } from './i18n'

const configuredTestVariant = import.meta.env.VITE_RERUNE_VARIANT?.trim()
const testVariant = configuredTestVariant && configuredTestVariant !== ReRune.Main ? configuredTestVariant : 'vip'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App client={client} testVariant={testVariant} />
  </React.StrictMode>
)
