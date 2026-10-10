import type { AxiosInstance } from 'axios';
import { ApiError } from '../utils/ApiError';
import type { ReportPhoto } from './photoService';

export const categories = ['Buraco e pavimentação', 'Iluminação pública', 'Limpeza urbana', 'Saneamento',
  'Água e esgoto', 'Trânsito e sinalização', 'Árvore e área verde', 'Outros'] as const;
export type ReportInput = { titulo: string; descricao: string; localizacao: string; bairro: string; categoria: string; latitude?: number; longitude?: number };
export type Report = ReportInput & { id: number; userId?: number; status: string; resolucaoStatus: string; imageUrl?: string | null; imageUrls?: string[]; motivoRejeicao?: string | null; setorResponsavel?: string | null; createdAt?: string; User?: { username: string } };
export type HistoryEntry = { id: number; tipo: string; statusAnterior: string | null; statusNovo: string; motivo?: string | null; responsavel?: string | null; createdAt: string; User?: { username: string } };
export async function getReportHistory(client: AxiosInstance, id: number, signal?: AbortSignal): Promise<HistoryEntry[]> {
  const { data } = await client.get(`denuncia/${id}/historico`, { signal });
  if (!Array.isArray(data) || !data.every((item) => item && Number.isInteger(item.id) && typeof item.tipo === 'string' && typeof item.statusNovo === 'string' && typeof item.createdAt === 'string')) {
    throw new ApiError('Histórico de denúncia inválido.', 'INVALID_RESPONSE');
  }
  return data;
}
export type ReportPage = { data: Report[]; page: number; totalPages: number; total: number };
export function parseReport(data: unknown): Report {
  const value = data as Partial<Report> | null;
  if (!value || !Number.isInteger(value.id) || typeof value.titulo !== 'string'
    || typeof value.descricao !== 'string' || typeof value.localizacao !== 'string'
    || typeof value.status !== 'string' || typeof value.resolucaoStatus !== 'string'
    || (value.imageUrls != null && (!Array.isArray(value.imageUrls) || !value.imageUrls.every((url) => typeof url === 'string')))
    || (value.imageUrl != null && typeof value.imageUrl !== 'string')) {
    throw new ApiError('Resposta de denúncia inválida. Tente novamente.', 'INVALID_RESPONSE');
  }
  return { ...value, bairro: value.bairro ?? '', categoria: value.categoria ?? 'Outros' } as Report;
}
export async function listReports(client: AxiosInstance, page: number, title: string, signal?: AbortSignal): Promise<ReportPage> {
  const { data } = await client.get('denuncia', { params: { page, limit: 12, titulo: title.trim() }, signal });
  if (!data || !Array.isArray(data.data) || !Number.isInteger(data.totalPages)
    || !Number.isInteger(data.total) || !Number.isInteger(data.page)) {
    throw new ApiError('Lista de denúncias inválida. Tente novamente.', 'INVALID_RESPONSE');
  }
  return { ...data, data: data.data.map(parseReport) };
}
export async function getReport(client: AxiosInstance, id: number, signal?: AbortSignal): Promise<Report> {
  const { data } = await client.get(`denuncia/${id}`, { signal });
  return parseReport(data);
}
export async function listMyReports(client: AxiosInstance, userId: number, page: number, title: string, signal?: AbortSignal): Promise<ReportPage> {
  const { data } = await client.get(`denuncia/user/${userId}`, { signal });
  if (!Array.isArray(data)) throw new ApiError('Lista de denúncias inválida.', 'INVALID_RESPONSE');
  const reports = data.map(parseReport).filter((report) => report.titulo.toLocaleLowerCase('pt-BR').includes(title.trim().toLocaleLowerCase('pt-BR')));
  return { data: reports.slice((page - 1) * 12, page * 12), total: reports.length, page, totalPages: Math.ceil(reports.length / 12) };
}
export async function getSubmission(client: AxiosInstance, key: string): Promise<Report> {
  const { data } = await client.get(`denuncia/submissions/${key}`);
  return parseReport(data?.denuncia);
}
export async function updateReport(client: AxiosInstance, id: number, input: ReportInput, photos: ReportPhoto[] = [], removeImages = false): Promise<Report> {
  if (photos.length > 4) throw new ApiError('Você pode anexar até quatro fotos.', 'IMAGE_LIMIT');
  const fields = { ...input, latitude: input.latitude ?? null, longitude: input.longitude ?? null, ...(removeImages ? { removeImages: true } : {}) };
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value === null ? '' : String(typeof value === 'string' ? value.trim() : value));
  for (const photo of photos) form.append('imagens', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  const { data } = await client.put(`denuncia/${id}`, photos.length ? form : fields);
  return parseReport(data?.denuncia);
}
export async function createReport(client: AxiosInstance, input: ReportInput, photos: ReportPhoto[] = [], key?: string): Promise<Report> {
  if (photos.length > 4) throw new ApiError('Você pode anexar até quatro fotos.', 'IMAGE_LIMIT');
  const fields = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
  for (const photo of photos) form.append('imagens', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  // Axios/React Native define o boundary; não fixar Content-Type manualmente.
  const { data } = await client.post('denuncia', photos.length ? form : fields, key ? { headers: { 'Idempotency-Key': key } } : undefined);
  return parseReport(data?.denuncia);
}
