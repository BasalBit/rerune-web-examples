import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './App'
import { clientReady } from './i18n'

void clientReady.then(client => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App client={client} />
    </React.StrictMode>
  )
}).catch(error => {
  console.error('Localization startup failed', error)
  document.getElementById('root')!.textContent = 'Could not initialize translations.'
})
