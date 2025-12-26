export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string;
  timestamp?: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}
