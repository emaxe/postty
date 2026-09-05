import crypto from 'node:crypto';
import { db, UserRecord, DeviceCodeRecord } from '../../db/memory-db.js';
import { Workspace } from '@postty/contracts';

export class AuthService {
  public static hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  }

  public static verifyPassword(password: string, hash: string, salt: string): boolean {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }

  public static registerUser(email: string, password: string, name: string): UserRecord {
    const existing = Array.from(db.users.values()).find((u) => u.email === email.toLowerCase());
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const { hash, salt } = this.hashPassword(password);
    const userId = crypto.randomUUID();

    const user: UserRecord = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash: hash,
      salt,
      name,
      createdAt: new Date().toISOString(),
    };
    db.users.set(userId, user);

    // Create personal workspace for user
    const workspaceId = crypto.randomUUID();
    const workspace: Workspace = {
      id: workspaceId,
      name: `${name}'s Workspace`,
      type: 'personal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.workspaces.set(workspaceId, workspace);

    db.members.push({
      userId,
      workspaceId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });

    return user;
  }

  public static loginUser(email: string, password: string): UserRecord {
    const user = Array.from(db.users.values()).find((u) => u.email === email.toLowerCase());
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = this.verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  // --- OAuth 2.0 Device Code Flow (RFC 8628) for Terminal TUI / CLI ---

  public static createDeviceCode(): {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
  } {
    const deviceCode = crypto.randomBytes(32).toString('hex');

    // Human-friendly 8-character user code like 'WDJB-MJGN'
    const chars = 'BCDFGHJKLMNPQRSTVWXYZ23456789';
    const randomChars = (len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const userCode = `${randomChars(4)}-${randomChars(4)}`;

    const expiresIn = 900; // 15 minutes
    const expiresAt = Date.now() + expiresIn * 1000;

    const record: DeviceCodeRecord = {
      deviceCode,
      userCode,
      userId: null,
      status: 'pending',
      expiresAt,
    };
    db.deviceCodes.set(deviceCode, record);

    return {
      deviceCode,
      userCode,
      verificationUri: 'http://localhost:3000/activate',
      expiresIn,
      interval: 3,
    };
  }

  public static pollDeviceToken(deviceCode: string): {
    status: 'pending' | 'authorized' | 'expired';
    userId: string | null;
  } {
    const record = db.deviceCodes.get(deviceCode);
    if (!record) {
      return { status: 'expired', userId: null };
    }

    if (Date.now() > record.expiresAt) {
      record.status = 'expired';
      return { status: 'expired', userId: null };
    }

    return {
      status: record.status,
      userId: record.userId,
    };
  }

  public static authorizeDevice(userCode: string, userId: string): boolean {
    const formattedCode = userCode.trim().toUpperCase();
    const record = Array.from(db.deviceCodes.values()).find(
      (r) => r.userCode === formattedCode
    );

    if (!record || Date.now() > record.expiresAt) {
      return false;
    }

    record.userId = userId;
    record.status = 'authorized';
    return true;
  }
}
