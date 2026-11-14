import type { AxiosInstance } from 'axios';
import { ApiError } from '../utils/ApiError';
export type CommunityFilters = { categoria?: string; resolucaoStatus?: string };
export type CommunityPoint = { id: number; titulo: string; categoria: string; status: 'aprovada'; resolucaoStatus: string; latitude: number; longitude: number };
export type Community = { summary: { total: number; em_andamento: number; resolvida: number }; categories: { label: string; total: number }[];
  points: CommunityPoint[]; total: number; limit: number; truncated: boolean; invalidPoints: number };
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const resolutions = ['aberta', 'em_andamento', 'resolvida'];
export async function getCommunity(client: AxiosInstance, filters: CommunityFilters = {}, signal?: AbortSignal): Promise<Community> {
  const { data } = await client.get('community', { params: filters, signal });
  const invalid = () => { throw new ApiError('Resposta da comunidade inválida. Tente novamente.', 'INVALID_RESPONSE'); };
  if (!data || data.scope !== 'community' || data.privacy?.coordinatePrecision !== 2 || data.privacy?.approximate !== true
    || !data.summary || !['total', 'em_andamento', 'resolvida'].every(key => count(data.summary[key]))
    || data.summary.em_andamento + data.summary.resolvida > data.summary.total
    || !Array.isArray(data.categories) || !data.categories.every((item: any) => typeof item?.label === 'string' && count(item.total))
    || data.categories.reduce((sum: number, item: any) => sum + item.total, 0) !== data.summary.total
    || !Array.isArray(data.points) || !count(data.total) || data.total > data.summary.total || data.limit !== 500
    || data.points.length > data.limit || data.points.length !== Math.min(data.total, data.limit)
    || typeof data.truncated !== 'boolean' || data.truncated !== (data.total > data.limit)) invalid();
  const points: CommunityPoint[] = [];
  const ids = new Set<number>();
  for (const point of data.points) {
    if (!point || !Number.isSafeInteger(point.id) || point.id < 1 || ids.has(point.id) || point.status !== 'aprovada'
      || typeof point.titulo !== 'string' || typeof point.categoria !== 'string' || !resolutions.includes(point.resolucaoStatus)) invalid();
    ids.add(point.id);
    if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number' || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)
      || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) continue;
    if (Math.abs(point.latitude * 100 - Math.round(point.latitude * 100)) > 1e-7 || Math.abs(point.longitude * 100 - Math.round(point.longitude * 100)) > 1e-7) invalid();
    points.push({ id: point.id, titulo: point.titulo, categoria: point.categoria, status: 'aprovada', resolucaoStatus: point.resolucaoStatus, latitude: point.latitude, longitude: point.longitude });
  }
  return { summary: { total: data.summary.total, em_andamento: data.summary.em_andamento, resolvida: data.summary.resolvida },
    categories: data.categories.map((item: any) => ({ label: item.label, total: item.total })),
    points, total: data.total, limit: data.limit, truncated: data.truncated, invalidPoints: data.points.length - points.length };
}
