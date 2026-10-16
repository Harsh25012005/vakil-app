// Must load before Metro: caps concurrent file opens (EMFILE on Windows + Node 26). See the file.
require('./scripts/fs-limit');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
// backend/shared is a workspace package the app imports types from.
const sharedRoot = path.resolve(projectRoot, 'backend/shared');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = withNativeWind(config, { input: './global.css' });
