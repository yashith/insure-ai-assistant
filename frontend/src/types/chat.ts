export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response?: string;
  message?: string;
  [key: string]: any;
}