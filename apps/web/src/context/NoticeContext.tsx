import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface NoticeContextValue {
  notice: string;
  showNotice: (message: string) => void;
  dismissNotice: () => void;
}

const NoticeContext = createContext<NoticeContextValue | null>(null);

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState("");
  const showNotice = useCallback((message: string) => setNotice(message), []);
  const dismissNotice = useCallback(() => setNotice(""), []);
  const value = useMemo(() => ({ notice, showNotice, dismissNotice }), [notice, showNotice, dismissNotice]);
  return <NoticeContext.Provider value={value}>{children}</NoticeContext.Provider>;
}

export function useNotice(): NoticeContextValue {
  const context = useContext(NoticeContext);
  if (!context) throw new Error("useNotice must be used within NoticeProvider");
  return context;
}
