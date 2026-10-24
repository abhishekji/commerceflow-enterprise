import { API_BASE } from "../common/constants";
import { HttpStatus } from "../common/enums";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code?: string) {
    super(code || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { code?: string };
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (response.status === HttpStatus.NoContent) return null as T;

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) throw new ApiError(response.status, body?.error?.code);
  return body?.data as T;
}

export function jsonBody(payload: unknown): RequestInit {
  return { body: JSON.stringify(payload) };
}
