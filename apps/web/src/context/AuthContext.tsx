import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AUTH_MESSAGES, STORAGE_KEYS } from "../common/constants";
import { HttpStatus } from "../common/enums";
import type { LoginCredentials, RegisterPayload, Session } from "../common/types";
import { authService } from "../services";
import { resetBodyClasses } from "../utils/dom";
import { errorStatus } from "../utils/errors";

interface AuthContextValue {
  session: Session | null;
  ready: boolean;
  authError: string;
  loggingOut: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => Promise<boolean>;
  expireSession: () => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let current = true;
    authService
      .me()
      .then((data) => current && setSession(data))
      .catch((error) => {
        if (current && errorStatus(error) !== HttpStatus.Unauthorized) setAuthError(AUTH_MESSAGES.CONNECTION);
      })
      .finally(() => current && setReady(true));
    return () => {
      current = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthError("");
    try {
      setSession(await authService.login(credentials));
      return true;
    } catch (error) {
      setAuthError(errorStatus(error) === HttpStatus.Unauthorized ? AUTH_MESSAGES.LOGIN_INVALID : AUTH_MESSAGES.LOGIN_FAILED);
      return false;
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setAuthError("");
    try {
      setSession(await authService.register(payload));
      return true;
    } catch (error) {
      const status = errorStatus(error);
      setAuthError(
        status === HttpStatus.Conflict
          ? AUTH_MESSAGES.REGISTER_SLUG_TAKEN
          : status === HttpStatus.BadRequest
            ? AUTH_MESSAGES.REGISTER_INVALID
            : AUTH_MESSAGES.REGISTER_FAILED,
      );
      return false;
    }
  }, []);

  const clearLocalState = useCallback(() => {
    setSession(null);
    setAuthError("");
    sessionStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS_SEEN);
    resetBodyClasses();
  }, []);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      setLoggingOut(false);
      return false;
    }
    clearLocalState();
    setLoggingOut(false);
    return true;
  }, [clearLocalState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session, ready, authError, loggingOut, login, register, logout,
      expireSession: () => setSession(null),
      clearAuthError: () => setAuthError(""),
    }),
    [session, ready, authError, loggingOut, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

/** For pages rendered only behind ProtectedRoute, where a session always exists. */
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error("useSession requires an authenticated session");
  return session;
}
