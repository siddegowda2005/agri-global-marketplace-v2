import { useEffect, useState, useCallback } from 'react';
import api, { errMsg } from '../services/api.js';
/** GET helper: { data, loading, error, reload }. `url` null skips the request. */
export function useApi(url, params) {
  const [state, set] = useState({ data: null, loading: !!url, error: null });
  const key = JSON.stringify(params || {});
  const load = useCallback(() => {
    if (!url) return Promise.resolve();
    set((s) => ({ ...s, loading: true, error: null }));
    return api.get(url, { params }).then((r) => set({ data: r.data, loading: false, error: null }))
      .catch((e) => set({ data: null, loading: false, error: errMsg(e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
