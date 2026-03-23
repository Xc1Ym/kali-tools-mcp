/**
 * Acunetix API Client
 * Base client for interacting with Acunetix Vulnerability Scanner API
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

/**
 * Acunetix API configuration
 */
export interface AcunetixConfig {
  apiBaseUrl: string; // e.g., https://192.168.46.128:3443/api/v1
  apiKey: string; // API key for X-Auth header
  timeout?: number; // Request timeout in milliseconds
  rejectUnauthorized?: boolean; // SSL certificate validation (default: true)
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  cursor?: string;
  limit?: number;
  query?: string;
  sort?: string;
}

/**
 * Acunetix HTTP Client
 */
export class AcunetixClient {
  private config: AcunetixConfig;
  private baseUrl: URL;

  constructor(config: AcunetixConfig) {
    this.config = {
      timeout: 30000,
      rejectUnauthorized: false, // Allow self-signed certificates by default
      ...config,
    };

    // Ensure base URL ends with /api/v1
    let baseUrl = this.config.apiBaseUrl;
    if (!baseUrl.endsWith('/api/v1')) {
      baseUrl = baseUrl.replace(/\/$/, '') + '/api/v1';
    }

    this.baseUrl = new URL(baseUrl);
  }

  /**
   * Make HTTP request to Acunetix API
   */
  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve) => {
      // Construct full URL by appending path to base URL
      const fullUrl = this.baseUrl.href.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
      const url = new URL(fullUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'X-Auth': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
        rejectUnauthorized: this.config.rejectUnauthorized,
        timeout: this.config.timeout,
      };

      const req = lib.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const responseHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (value) {
              responseHeaders[key] = Array.isArray(value) ? value[0] : value;
            }
          }

          // Handle successful responses (2xx) and special cases
          if (res.statusCode === 204) {
            // No content (successful delete, etc.)
            resolve({
              success: true,
              statusCode: 204,
              headers: responseHeaders,
            });
            return;
          }

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const jsonData = data ? JSON.parse(data) : null;
              resolve({
                success: true,
                data: jsonData,
                statusCode: res.statusCode,
                headers: responseHeaders,
              });
            } catch (error) {
              // If parsing fails, return raw data
              resolve({
                success: true,
                data: (data || undefined) as T,
                statusCode: res.statusCode,
                headers: responseHeaders,
              });
            }
          } else {
            // Error response
            let errorMessage = `HTTP ${res.statusCode}`;
            try {
              const errorData = JSON.parse(data);
              if (errorData.error) {
                errorMessage = errorData.error;
              } else if (errorData.message) {
                errorMessage = errorData.message;
              }
            } catch {
              if (data) {
                errorMessage = data;
              }
            }

            resolve({
              success: false,
              error: errorMessage,
              statusCode: res.statusCode,
              headers: responseHeaders,
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout',
        });
      });

      // Send request body if present
      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * GET request
   */
  async get<T = any>(path: string, params?: PaginationParams): Promise<ApiResponse<T>> {
    let fullPath = path;

    // Add query parameters
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.cursor) queryParams.append('cursor', params.cursor);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.query) queryParams.append('q', params.query);
      if (params.sort) queryParams.append('sort', params.sort);

      const queryString = queryParams.toString();
      if (queryString) {
        fullPath += (path.includes('?') ? '&' : '?') + queryString;
      }
    }

    return this.request<T>('GET', fullPath);
  }

  /**
   * POST request
   */
  async post<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  /**
   * PUT request
   */
  async put<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Get API info
   */
  async getInfo(): Promise<ApiResponse<any>> {
    return this.get('/info');
  }

  /**
   * Get me (current user info)
   */
  async getMe(): Promise<ApiResponse<any>> {
    return this.get('/me');
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getMe();
      return response.success;
    } catch {
      return false;
    }
  }
}
