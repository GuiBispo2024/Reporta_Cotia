import { Platform, Share } from 'react-native';
import { openReportShare, shareMessage } from '../src/services/shareService';
import type { Report } from '../src/services/reportService';
const report = { id: 9, titulo: 'Buraco', localizacao: 'Rua A' } as Report;

test('compartilhamento não inclui o número residencial de denúncias existentes', () => {
  const message = shareMessage({ ...report, localizacao: 'Rua A, 123, Cotia' });
  expect(message).toContain('Rua A, Cotia');
  expect(message).not.toContain('123');
});
test('sem site usa protocolo; URL só é adicionada quando configurada e válida', () => {
  expect(shareMessage(report)).toContain('Protocolo #9'); expect(shareMessage(report)).not.toContain('http');
  expect(shareMessage(report, 'https://example.org')).toContain('https://example.org/denuncia/9');
  expect(() => shareMessage(report, 'javascript:bad')).toThrow();
});
test('sharedAction do Android exige confirmação; dismissedAction do iOS cancela', async () => {
  const original = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  const native = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  expect(await openReportShare(report)).toBe('confirm');
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' }); native.mockResolvedValue({ action: Share.dismissedAction });
  expect(await openReportShare(report)).toBe('cancelled');
  native.mockResolvedValue({ action: Share.sharedAction }); expect(await openReportShare(report)).toBe('shared');
  native.mockRestore(); Object.defineProperty(Platform, 'OS', original);
});
