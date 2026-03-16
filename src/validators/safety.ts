import { z } from 'zod';

/**
 * Safety check levels
 */
export enum SafetyLevel {
  SAFE = 'safe',
  CAUTION = 'caution',
  DANGEROUS = 'dangerous',
  PROHIBITED = 'prohibited',
}

/**
 * Risk assessment for tool operations
 */
export interface RiskAssessment {
  level: SafetyLevel;
  reasons: string[];
  requiresConfirmation: boolean;
  allowed: boolean;
}

/**
 * Assess risk of scanning operation
 */
export function assessScanRisk(options: {
  targets: string[];
  aggressiveScan: boolean;
  exploitAttempts: boolean;
  bruteForce: boolean;
}): RiskAssessment {
  const { targets, aggressiveScan, exploitAttempts, bruteForce } = options;
  const reasons: string[] = [];
  let level = SafetyLevel.SAFE;

  // Check for exploit attempts
  if (exploitAttempts) {
    level = SafetyLevel.PROHIBITED;
    reasons.push('Exploitation attempts are not allowed');
    return {
      level,
      reasons,
      requiresConfirmation: false,
      allowed: false,
    };
  }

  // Check for brute force
  if (bruteForce) {
    level = SafetyLevel.DANGEROUS;
    reasons.push('Brute force attacks can be detected and blocked');
  }

  // Check for aggressive scanning
  if (aggressiveScan) {
    if (level === SafetyLevel.SAFE) {
      level = SafetyLevel.CAUTION;
    }
    reasons.push('Aggressive scanning may trigger intrusion detection systems');
  }

  // Check number of targets
  if (targets.length > 10) {
    if (level === SafetyLevel.SAFE) {
      level = SafetyLevel.CAUTION;
    }
    reasons.push('Scanning multiple targets may generate significant network traffic');
  }

  // Since we returned early for PROHIBITED, level is now SAFE, CAUTION, or DANGEROUS
  return {
    level,
    reasons,
    requiresConfirmation: level === SafetyLevel.CAUTION || level === SafetyLevel.DANGEROUS,
    allowed: true, // We've already returned false for PROHIBITED cases
  };
}

/**
 * Check if command argument is safe
 */
export function isSafeArgument(arg: string): boolean {
  // Check for command injection patterns
  const injectionPatterns = [
    /[;&|`$()]/, // Shell metacharacters
    /\.\./, // Path traversal
    /\/\//, // Double slashes (potential bypass)
    /\${/, // Variable expansion
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(arg)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize command arguments
 */
export function sanitizeArguments(args: string[]): string[] {
  return args.filter((arg) => isSafeArgument(arg));
}

/**
 * Validate file path is safe
 */
export function isSafePath(path: string): boolean {
  // Prevent absolute paths
  if (path.startsWith('/')) {
    return false;
  }

  // Prevent path traversal
  if (path.includes('..')) {
    return false;
  }

  // Prevent home directory access
  if (path.startsWith('~')) {
    return false;
  }

  return true;
}

/**
 * Check if output size is reasonable
 */
export function isReasonableOutputSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size <= maxSize;
}

/**
 * Zod schema for safe string validation
 */
export const safeStringSchema = z.string().refine((val) => {
  return isSafeArgument(val);
}, {
  message: 'String contains potentially dangerous characters',
});

/**
 * Zod schema for safe path validation
 */
export const safePathSchema = z.string().refine((val) => {
  return isSafePath(val);
}, {
  message: 'Path contains potentially dangerous elements',
});

/**
 * Validate scan timing
 */
export function isValidTiming(timing: number): boolean {
  return timing >= 0 && timing <= 5;
}

/**
 * Validate scan intensity
 */
export function isValidIntensity(intensity: string): boolean {
  const validIntensities = ['normal', 'hard', 'insane', 'paranoid'];
  return validIntensities.includes(intensity.toLowerCase());
}

/**
 * Check if operation is within rate limits
 */
export class RateLimiter {
  private operations: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxOperations: number;

  constructor(windowMs: number = 60000, maxOperations: number = 10) {
    this.windowMs = windowMs;
    this.maxOperations = maxOperations;
  }

  canPerformOperation(identifier: string): boolean {
    const now = Date.now();
    const operations = this.operations.get(identifier) || [];

    // Remove operations outside the time window
    const recentOperations = operations.filter((time) => now - time < this.windowMs);

    if (recentOperations.length >= this.maxOperations) {
      return false;
    }

    recentOperations.push(now);
    this.operations.set(identifier, recentOperations);
    return true;
  }

  reset(identifier?: string): void {
    if (identifier) {
      this.operations.delete(identifier);
    } else {
      this.operations.clear();
    }
  }
}
