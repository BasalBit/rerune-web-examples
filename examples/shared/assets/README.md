# ReRune brand assets

The example apps retain the ReRune name and existing R/play-arrow icon.

- `rerune-logo.png`: unchanged header logo from the ReRune Android OTA example (`example-compose-app/src/main/res/drawable/logo.png`).
- `rerune-icon.png`: unchanged 1024px app icon from the ReRune SwiftUI OTA example (`Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png`). Used for browser favicons and the Expo launcher icon.

The assets are bundled locally. React/Vite and Angular copy them into their public output; Expo imports the header logo and uses the icon in its app configuration.
