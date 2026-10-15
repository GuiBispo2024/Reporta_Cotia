const { test } = require('node:test');
const assert = require('node:assert/strict');
const { configureAndroidMap } = require('../plugins/withReportMaps.cjs');
test('mapa insere chave uma vez e a remove sem afetar outros metadados', () => {
  const manifest = { manifest: { application: [{ $: { 'android:name': '.MainApplication' }, 'meta-data': [{ $: { 'android:name': 'another', 'android:value': 'keep' } }] }] } };
  configureAndroidMap(manifest, 'test-only'); configureAndroidMap(manifest, 'test-only');
  const metadata = manifest.manifest.application[0]['meta-data'];
  assert.equal(metadata.filter((item) => item.$['android:name'] === 'com.google.android.geo.API_KEY').length, 1);
  configureAndroidMap(manifest);
  assert.deepEqual(manifest.manifest.application[0]['meta-data'], [{ $: { 'android:name': 'another', 'android:value': 'keep' } }]);
});
