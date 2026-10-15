import type { AxiosInstance } from 'axios';
import { getReport } from './reportService';
import { toApiError } from '../utils/ApiError';
export async function setReportLike(client: AxiosInstance, id: number, liked: boolean) {
  try {
    if (liked) await client.post(`denuncia/${id}/like`);
    else await client.delete(`denuncia/${id}/like`);
  } catch (reason) {
    const error = toApiError(reason);
    if (!(liked && error.code === 'ALREADY_LIKED') && !(!liked && error.status === 404)) throw reason;
  }
  return getReport(client, id);
}
