import { createContext, useContext, useState, useCallback } from 'react';
const Ctx = createContext({ toast: () => {} });
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2" role="status" aria-live="polite">
        {items.map((i) => <div key={i.id} className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${i.type === 'error' ? 'bg-red-600' : 'bg-leaf-700'}`}>{i.message}</div>)}
      </div>
    </Ctx.Provider>
  );
}
