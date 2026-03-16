import { z } from 'zod';

/**
 * Validate IP address (IPv4)
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;

  const parts = ip.split('.');
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate IP address (IPv6)
 */
export function isValidIPv6(ip: string): boolean {
  // Basic IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
  const ipv6RegexWithCompression = /^(([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|::)$/;
  return ipv6Regex.test(ip) || ipv6RegexWithCompression.test(ip);
}

/**
 * Validate domain name
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(domain);
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate port number
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Validate CIDR notation
 */
export function isValidCIDR(cidr: string): boolean {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(cidr)) return false;

  const [ip, prefix] = cidr.split('/');
  const prefixNum = parseInt(prefix, 10);

  if (!isValidIPv4(ip)) return false;
  if (prefixNum < 0 || prefixNum > 32) return false;

  return true;
}

/**
 * Normalize target to consistent format
 */
export function normalizeTarget(target: string): string {
  target = target.trim();

  // Remove protocol if present
  if (target.startsWith('http://') || target.startsWith('https://')) {
    try {
      const url = new URL(target);
      target = url.hostname;
    } catch {
      // If URL parsing fails, return as-is
    }
  }

  // Remove port if present
  if (target.includes(':')) {
    target = target.split(':')[0];
  }

  // Remove path if present
  if (target.includes('/')) {
    target = target.split('/')[0];
  }

  return target.toLowerCase();
}

/**
 * Parse and validate target list
 */
export function parseTargets(targets: string | string[]): string[] {
  if (typeof targets === 'string') {
    targets = targets.split(/[,\s]+/).filter(Boolean);
  }

  return targets.map(normalizeTarget).filter((target) => {
    return isValidIPv4(target) || isValidIPv6(target) || isValidDomain(target);
  });
}

/**
 * Zod schema for network target validation
 */
export const targetSchema = z.string().refine((val) => {
  const normalized = normalizeTarget(val);
  return isValidIPv4(normalized) || isValidIPv6(normalized) || isValidDomain(normalized);
}, {
  message: 'Invalid target. Must be a valid IPv4, IPv6, or domain name.',
});

/**
 * Zod schema for port validation
 */
export const portSchema = z.number().int().min(1).max(65535);

/**
 * Zod schema for port range
 */
export const portRangeSchema = z.object({
  start: z.number().int().min(1).max(65535),
  end: z.number().int().min(1).max(65535),
}).refine((data) => data.start <= data.end, {
  message: 'Start port must be less than or equal to end port',
});

/**
 * Validate multiple targets
 */
export async function validateTargets(targets: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const target of targets) {
    try {
      await targetSchema.parseAsync(target);
      valid.push(normalizeTarget(target));
    } catch {
      invalid.push(target);
    }
  }

  return { valid, invalid };
}
