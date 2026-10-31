// metro.config.js — web resolver stub for react-native-maps
// The stub is ONLY used when platform=web (browser preview).
// Android builds use the real react-native-maps via the normal resolver.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === 'react-native-maps' || moduleName.startsWith('react-native-maps/'))
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/stubs/maps-stub.web.js'),
    };
  }
  if (originalResolve) return originalResolve(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
