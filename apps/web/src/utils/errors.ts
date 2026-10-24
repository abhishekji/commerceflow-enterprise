import { DEFAULT_ERROR_MESSAGE, ERROR_MESSAGES } from "../common/constants";

export function errorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  return (code && ERROR_MESSAGES[code]) || DEFAULT_ERROR_MESSAGE;
}

export function errorStatus(error: unknown): number | undefined {
  return (error as { status?: number } | null)?.status;
}
