import { Injectable, Logger } from '@nestjs/common';

export enum AuditEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGIN_LOCKED = 'LOGIN_LOCKED',
  SIGNUP = 'SIGNUP',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  ADMIN_ACTION = 'ADMIN_ACTION',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger('AuditLogger');

  log(event: AuditLogEntry): void {
    const logMessage = {
      event: event.eventType,
      userId: event.userId,
      username: event.username,
      ip: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      timestamp: event.timestamp.toISOString(),
    };

    // Log based on severity
    switch (event.eventType) {
      case AuditEventType.LOGIN_FAILURE:
      case AuditEventType.LOGIN_LOCKED:
      case AuditEventType.ACCOUNT_LOCKED:
      case AuditEventType.ACCOUNT_DELETED:
      case AuditEventType.SUSPICIOUS_ACTIVITY:
        this.logger.warn(JSON.stringify(logMessage));
        break;
      case AuditEventType.LOGIN_SUCCESS:
      case AuditEventType.SIGNUP:
        this.logger.log(JSON.stringify(logMessage));
        break;
      default:
        this.logger.log(JSON.stringify(logMessage));
    }

    // In production, you would also send this to:
    // - CloudWatch / Datadog / Grafana
    // - SIEM system
    // - Database for long-term storage
  }

  logLoginSuccess(
    userId: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.log({
      eventType: AuditEventType.LOGIN_SUCCESS,
      userId,
      username,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  logLoginFailure(
    usernameOrEmail: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.log({
      eventType: AuditEventType.LOGIN_FAILURE,
      username: usernameOrEmail,
      ipAddress,
      userAgent,
      details: { reason },
      timestamp: new Date(),
    });
  }

  logAccountLocked(
    userId: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.log({
      eventType: AuditEventType.ACCOUNT_LOCKED,
      userId,
      username,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  logSuspiciousActivity(
    eventType: string,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.log({
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      ipAddress,
      userAgent,
      details: { eventType, ...details },
      timestamp: new Date(),
    });
  }
}
