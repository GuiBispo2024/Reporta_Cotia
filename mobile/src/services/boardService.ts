import type { AxiosInstance } from 'axios';
import { ApiError } from '../utils/ApiError';

const summaryFields = ['total', 'pendente', 'approved', 'rejeitada', 'em_andamento', 'resolvida'] as const;
export type PersonalBoardSummary = Record<typeof summaryFields[number], number>;

export function parsePersonalBoard(data: unknown): PersonalBoardSummary {
  const board = data as { scope?: unknown; summary?: unknown } | null;
  const summary = board?.summary as Partial<PersonalBoardSummary> | null;
  if (board?.scope !== 'mine' || !summary || summaryFields.some((field) => !Number.isSafeInteger(summary[field]) || summary[field]! < 0)
    || summary.total !== summary.pendente! + summary.approved! + summary.rejeitada!
    || summary.em_andamento! + summary.resolvida! > summary.approved!) {
    throw new ApiError('Os indicadores pessoais recebidos são inválidos. Tente novamente.', 'INVALID_RESPONSE');
  }
  // Keep only counters, never the report records returned alongside the summary.
  return Object.fromEntries(summaryFields.map((field) => [field, summary[field]])) as PersonalBoardSummary;
}

export async function getPersonalBoard(client: AxiosInstance, signal?: AbortSignal): Promise<PersonalBoardSummary> {
  // Existing column pagination affects only report cards, not the account-wide summary.
  // One selected column with one record avoids fetching five columns we do not display.
  const { data } = await client.get('boards/mine', { params: { column: 'pendente', limit: 1 }, signal });
  return parsePersonalBoard(data);
}
