import fs from 'fs/promises';
import path from 'path';

export interface SecurityConfig {
  allowedTargets: string[];
  blockedTargets: string[];
  blockedRanges: string[];
  defaultTimeout: number;
  maxConcurrentScans: number;
  logLevel: string;
  requireConfirmationFor: string[];
  acunetix?: {
    apiBaseUrl?: string;
    apiKey?: string;
    timeout?: number;
    rejectUnauthorized?: boolean;
  };
  msfrpc?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    uri?: string;
    timeout?: number;
  };
}

let config: SecurityConfig | null = null;

/**
 * Load security configuration
 */
export async function loadConfig(configPath: string = 'config/default.json'): Promise<SecurityConfig> {
  if (config) {
    return config;
  }

  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(configData) as SecurityConfig;
    return config;
  } catch (error) {
    // Return default config if file doesn't exist
    config = {
      allowedTargets: [],
      blockedTargets: ['localhost', '127.0.0.1', '0.0.0.0', '::1'],
      blockedRanges: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
      defaultTimeout: 300,
      maxConcurrentScans: 3,
      logLevel: 'info',
      requireConfirmationFor: ['aggressive_scan', 'brute_force', 'exploitation'],
    };
    return config;
  }
}

/**
 * Check if target is allowed
 */
export function isTargetAllowed(
  target: string,
  securityConfig: SecurityConfig
): { allowed: boolean; reason?: string } {
  // Check blocked targets
  if (securityConfig.blockedTargets.includes(target)) {
    return { allowed: false, reason: 'Target is in blocked list' };
  }

  // Check if target is localhost variant
  const lowerTarget = target.toLowerCase();
  if (lowerTarget === 'localhost' || lowerTarget.startsWith('127.') || lowerTarget === '::1') {
    return { allowed: false, reason: 'Cannot scan localhost' };
  }

  // Check if target is in allowedTargets first (whitelist takes precedence)
  if (securityConfig.allowedTargets.length > 0) {
    // Check for exact match or CIDR range match
    const isInAllowed = securityConfig.allowedTargets.some(allowedTarget => {
      if (allowedTarget === target) return true;
      // Check if target is within a CIDR range (simplified check)
      if (allowedTarget.includes('/')) {
        return isIPInCIDRRange(target, allowedTarget);
      }
      return false;
    });

    if (isInAllowed) {
      return { allowed: true };
    }

    // If we have an allowedTargets list and target is not in it, block it
    return { allowed: false, reason: 'Target not in whitelist' };
  }

  // Check blocked IP ranges (only if no whitelist configured)
  if (isPrivateIP(target, securityConfig.blockedRanges)) {
    return { allowed: false, reason: 'Private IP ranges are not allowed' };
  }

  return { allowed: true };
}

/**
 * Check if IP is in private ranges
 */
function isPrivateIP(ip: string, blockedRanges: string[]): boolean {
  // Simple check for common private IP patterns
  const privatePatterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/i, // IPv6 private
    /^fe80:/i, // IPv6 link-local
  ];

  for (const pattern of privatePatterns) {
    if (pattern.test(ip)) {
      return true;
    }
  }

  // Check CIDR ranges (more sophisticated check could be added)
  for (const range of blockedRanges) {
    if (isIPInCIDR(ip, range)) {
      return true;
    }
  }

  return false;
}

/**
 * Simple CIDR check (could be improved with proper IP library)
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [network, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength || '32', 10);

  // This is a simplified check - proper implementation would use bitwise operations
  // For now, just check if IP starts with the network part
  if (cidr.startsWith('10.') && ip.startsWith('10.')) return true;
  if (cidr.startsWith('172.16.') && ip.startsWith('172.16.')) return true;
  if (cidr.startsWith('192.168.') && ip.startsWith('192.168.')) return true;

  return false;
}

/**
 * Check if IP is within a CIDR range (more precise)
 */
function isIPInCIDRRange(ip: string, cidr: string): boolean {
  const [network, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength || '32', 10);

  // For /16 networks like 192.168.0.0/16
  if (prefix === 16) {
    const networkParts = network.split('.').slice(0, 2).join('.');
    const ipParts = ip.split('.').slice(0, 2).join('.');
    return networkParts === ipParts;
  }

  // For /24 networks like 192.168.1.0/24
  if (prefix === 24) {
    const networkParts = network.split('.').slice(0, 3).join('.');
    const ipParts = ip.split('.').slice(0, 3).join('.');
    return networkParts === ipParts;
  }

  // For /8 networks like 10.0.0.0/8
  if (prefix === 8) {
    const networkPart = network.split('.')[0];
    const ipPart = ip.split('.')[0];
    return networkPart === ipPart;
  }

  // Default to simple CIDR check
  return isIPInCIDR(ip, cidr);
}

/**
 * Check if operation requires confirmation
 */
export function requiresConfirmation(
  operation: string,
  securityConfig: SecurityConfig
): boolean {
  return securityConfig.requireConfirmationFor.includes(operation);
}

/**
 * Sanitize input to prevent command injection
 */
export function sanitizeInput(input: string): boolean {
  // Check for dangerous characters
  const dangerousChars = /[;&|`$()<>]/;
  if (dangerousChars.test(input)) {
    return false;
  }

  // Check for path traversal
  if (input.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  event: string,
  details: Record<string, any>
): Promise<void> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };

  const logPath = path.join(process.cwd(), 'security.log');
  try {
    await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to write security log:', error);
  }
}

/**
 * Load security configuration (alias for loadConfig)
 */
export async function loadSecurityConfig(configPath: string = 'config/default.json'): Promise<SecurityConfig> {
  return loadConfig(configPath);
}
