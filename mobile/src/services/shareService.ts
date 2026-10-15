import { Platform, Share } from 'react-native';
import type { AxiosInstance } from 'axios';
import type { Report } from './reportService';
import { getReport } from './reportService';
import { ApiError } from '../utils/ApiError';
import { publicAddress } from '../utils/publicAddress';
export function shareMessage(report: Report, publicWebUrl = '') {
  const lines = [`Reporta Cotia — ${report.titulo}`, publicAddress(report.localizacao), `Protocolo #${report.id}`];
  if (publicWebUrl) {
    try {
      const url = new URL(publicWebUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('invalid');
      lines.push(`${url.toString().replace(/\/+$/, '')}/denuncia/${report.id}`);
    } catch { throw new ApiError('O endereço público de compartilhamento está configurado incorretamente.', 'INVALID_SHARE_URL'); }
  }
  return lines.join('\n');
}
export async function openReportShare(report: Report, publicWebUrl?: string): Promise<'cancelled' | 'confirm' | 'shared'> {
  const result = await Share.share({ title: report.titulo, message: shareMessage(report, publicWebUrl) });
  if (result.action !== Share.sharedAction) return 'cancelled';
  // Android returns sharedAction even when its sheet was dismissed. Require explicit confirmation.
  return Platform.OS === 'android' ? 'confirm' : 'shared';
}
export async function recordShare(client: AxiosInstance, id: number, key: string) {
  await client.post(`denuncia/${id}/share`, { clientRequestId: key });
  return getReport(client, id);
}
