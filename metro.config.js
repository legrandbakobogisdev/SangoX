const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support for Lucide or other ESM packages that use .js extensions in their imports
config.resolver.sourceExts.push('mjs');
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;

