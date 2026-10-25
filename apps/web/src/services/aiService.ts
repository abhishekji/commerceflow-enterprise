import { API_ENDPOINTS } from "../common/constants";
import { apiRequest, jsonBody } from "../utils/apiClient";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const aiService = {
  chat: (messages: ChatMessage[]) =>
    apiRequest<{ reply: string }>(API_ENDPOINTS.AI_CHAT, { method: "POST", ...jsonBody({ messages }) }),
  insights: (warehouseId: string) =>
    apiRequest<{ insights: string }>(API_ENDPOINTS.AI_INSIGHTS, {
      method: "POST",
      ...jsonBody(warehouseId ? { warehouseId } : {}),
    }),
};
