const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
// This shared source folder has no package manifest, so Expo does not watch it automatically.
config.watchFolders.push(path.resolve(__dirname, '../shared'))

module.exports = config
