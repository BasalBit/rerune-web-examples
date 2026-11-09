// Hermes, the React Native engine, has no Intl.PluralRules, which i18next needs
// to pick plural forms. Load the polyfill and the data of every language the
// app or the ReRune dashboard publishes before anything uses i18next.
import '@formatjs/intl-pluralrules/polyfill.js'
import '@formatjs/intl-pluralrules/locale-data/de.js'
import '@formatjs/intl-pluralrules/locale-data/en.js'
import '@formatjs/intl-pluralrules/locale-data/es.js'
import '@formatjs/intl-pluralrules/locale-data/fr.js'
import '@formatjs/intl-pluralrules/locale-data/it.js'
import '@formatjs/intl-pluralrules/locale-data/pt.js'
import '@formatjs/intl-pluralrules/locale-data/sq.js'
import '@formatjs/intl-pluralrules/locale-data/zh.js'
import { registerRootComponent } from 'expo'

import App from './App'

registerRootComponent(App)
