// Apple Maps autolinks on iOS. Android needs only the restricted Google Maps key.
// Use Expo's public API: react-native-maps 1.27.2 imports private @expo paths.
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');
function configureAndroidMap(manifest, apiKey) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  if (apiKey) AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, 'com.google.android.geo.API_KEY', apiKey);
  else AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(application, 'com.google.android.geo.API_KEY');
  return manifest;
}
module.exports = (config, { androidGoogleMapsApiKey } = {}) => withAndroidManifest(config, (conf) => {
  conf.modResults = configureAndroidMap(conf.modResults, androidGoogleMapsApiKey);
  return conf;
});
module.exports.configureAndroidMap = configureAndroidMap;
