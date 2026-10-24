import { API_ENDPOINTS } from "../common/constants";
import type { LoginCredentials, RegisterPayload, Session } from "../common/types";
import { apiRequest, jsonBody } from "../utils/apiClient";

export const authService = {
  me: () => apiRequest<Session>(API_ENDPOINTS.AUTH_ME),
  login: (credentials: LoginCredentials) =>
    apiRequest<Session>(API_ENDPOINTS.AUTH_LOGIN, { method: "POST", ...jsonBody(credentials) }),
  register: (payload: RegisterPayload) =>
    apiRequest<Session>(API_ENDPOINTS.AUTH_REGISTER, { method: "POST", ...jsonBody(payload) }),
  logout: () => apiRequest<null>(API_ENDPOINTS.AUTH_LOGOUT, { method: "POST" }),
};
