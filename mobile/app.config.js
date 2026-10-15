const { loadEnvironment } = require('./config/environment.cjs');

module.exports = () => {
  const environment = loadEnvironment();
  const isDevelopment = environment.appEnv === 'development';
  const suffix = environment.appEnv === 'production' ? '' : `.${environment.appEnv}`;
  return {
    name: `Reporta Cotia${suffix ? ` (${environment.appEnv})` : ''}`,
    slug: 'reporta-cotia-mobile',
    version: '0.1.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    platforms: ['android', 'ios'],
    scheme: `reportacotia${suffix.replace('.', '-')}`,
    ios: {
      bundleIdentifier: `br.com.reportacotia.app${suffix}`,
      supportsTablet: true,
      infoPlist: {
        NSAppTransportSecurity: isDevelopment
          ? { NSAllowsLocalNetworking: true, NSAllowsArbitraryLoads: true }
          : { NSAllowsArbitraryLoads: false },
        ...(isDevelopment ? { NSLocalNetworkUsageDescription: 'Conectar à API local de desenvolvimento do Reporta Cotia.' } : {}),
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: { package: `br.com.reportacotia.app${suffix}` },
    plugins: [['expo-dev-client', { launchMode: 'launcher' }], ['./plugins/withReportMaps.cjs', {
      ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY ? { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY } : {}),
    }], 'expo-status-bar', 'expo-secure-store', ['expo-image-picker', {
      photosPermission: 'Selecionar fotos para anexar à denúncia.', cameraPermission: 'Fotografar problemas urbanos para a denúncia.', microphonePermission: false,
    }], ['expo-location', { locationWhenInUsePermission: 'Usar sua localização para indicar onde está o problema urbano.' }], ['expo-build-properties', { android: { usesCleartextTraffic: isDevelopment } }]],
    extra: { ...environment, mapsAndroidConfigured: !!process.env.GOOGLE_MAPS_ANDROID_API_KEY, publicWebUrl: process.env.PUBLIC_WEB_URL || '' },
  };
};
