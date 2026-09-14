import { bootstrapApplication } from '@angular/platform-browser'
import { App, appConfig } from './app'

bootstrapApplication(App, appConfig).catch(error => console.error(error))
