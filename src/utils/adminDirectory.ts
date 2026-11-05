import { DateTime } from 'luxon';

export const memberDirectoryDefaults = { state: '', memberType: '', access: '' };
export const reserveDirectoryDefaults = { date: 'upcoming', from: '', to: '', court: '', turn: '' };

export interface DirectoryPage<T> { items: T[]; total: number; page: number; pageSize: number; pages: number }

export function directoryParams(search: URLSearchParams, defaults: Record<string, string>) {
  const result: Record<string, string> = { search: search.get('search') || '', page: search.get('page') || '1', pageSize: search.get('pageSize') || '25' };
  for (const [key, value] of Object.entries(defaults)) result[key] = search.get(key) ?? value;
  return result;
}

export function reserveRequestParams(params: Record<string, string>, now = DateTime.now().setZone('America/Santiago')) {
  const { date, from, to, ...rest } = params;
  if (date === 'today' || date === 'tomorrow') {
    const day = now.plus({ days: date === 'tomorrow' ? 1 : 0 }).toISODate()!;
    return { ...rest, from: day, to: day };
  }
  return date === 'range' ? { ...rest, from, to } : rest;
}
