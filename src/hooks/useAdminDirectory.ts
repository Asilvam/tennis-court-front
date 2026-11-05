import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { getTokenFromLocalStorage } from '../utils/tokenUtils';
import { directoryParams, type DirectoryPage } from '../utils/adminDirectory';

export function useAdminDirectory<T>(endpoint: string, defaults: Record<string, string>, requestParams?: (params: Record<string, string>) => Record<string, string>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => directoryParams(searchParams, defaults), [searchParams, defaults]);
  const [searchTerm, setSearchTerm] = useState(params.search);
  const [result, setResult] = useState<DirectoryPage<T>>({ items: [], total: 0, page: 1, pageSize: 25, pages: 1 });
  const [ready, setReady] = useState(false);
  const [fetching, setFetching] = useState(true);
  const sequence = useRef(0);
  const invalidate = useCallback(() => { sequence.current++; }, []);
  const apiUrl = import.meta.env.VITE_API_URL;
  const setParam = useCallback((key: string, value: string) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (!value || value === defaults[key] || (key === 'page' && value === '1') || (key === 'pageSize' && value === '25')) next.delete(key);
      else next.set(key, value);
      if (key !== 'page') next.delete('page');
      return next;
    }, { replace: true });
  }, [defaults, setSearchParams]);

  useEffect(() => setSearchTerm(params.search), [params.search]);
  useEffect(() => {
    if (searchTerm === params.search) return;
    const timer = window.setTimeout(() => setParam('search', searchTerm.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, params.search, setParam]);

  const fetchPage = useCallback(async (signal?: AbortSignal) => {
    const current = ++sequence.current;
    setFetching(true);
    try {
      const query = requestParams ? requestParams(params) : params;
      const { data } = await axios.get<DirectoryPage<T>>(`${apiUrl}/admin-directory/${endpoint}`, {
        params: Object.fromEntries(Object.entries(query).filter(([, value]) => value !== '')),
        headers: { Authorization: `Bearer ${getTokenFromLocalStorage()}` }, signal, timeout: 15000,
      });
      if (signal?.aborted || current !== sequence.current) return;
      setResult(data);
      if (String(data.page) !== params.page) setParam('page', String(data.page));
    } catch (error) {
      if (signal?.aborted || current !== sequence.current || axios.isCancel(error)) return;
      if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
        await Swal.fire({ icon: 'error', title: 'No se pudo cargar el listado', text: axios.isAxiosError(error) ? String(error.response?.data?.message || 'Intenta nuevamente.') : 'Intenta nuevamente.' });
      }
    } finally {
      if (!signal?.aborted && current === sequence.current) { setReady(true); setFetching(false); }
    }
  }, [apiUrl, endpoint, params, requestParams, setParam]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchPage(controller.signal);
    return () => { controller.abort(); invalidate(); };
  }, [fetchPage, invalidate]);

  const clear = () => { setSearchTerm(''); setSearchParams({}, { replace: true }); };
  return { ...result, params, searchTerm, updateSearchTerm: setSearchTerm, setParam, clear, fetching, loading: !ready, refresh: fetchPage };
}
