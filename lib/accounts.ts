import { Vehicle, Display } from "./vehicle";
import { readLocal, writeLocal } from "./storage";

export const MASTER_ADMIN_EMAIL = "mrgobeast@gmail.com";

export type UserAccount = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  vehicle: Vehicle;
  display: Display;
  paint: number;
  inviteCodeUsed?: string;
  createdAt: number;
};

export type InviteCode = {
  code: string;
  createdBy: string;
  createdAt: number;
  usedBy?: string;
  usedAt?: number;
  active: boolean;
};

const DEFAULT_CODES: InviteCode[] = [
  {
    code: "VOLTA-VIP-2026",
    createdBy: MASTER_ADMIN_EMAIL,
    createdAt: 1730100000000,
    active: true,
  },
  {
    code: "TESLA-PASSENGER-01",
    createdBy: MASTER_ADMIN_EMAIL,
    createdAt: 1730100000000,
    active: true,
  },
  {
    code: "FRONTROW-EXCLUSIVE",
    createdBy: MASTER_ADMIN_EMAIL,
    createdAt: 1730100000000,
    active: true,
  },
];

export function isMasterAdmin(email: string): boolean {
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}

export function getInviteCodes(): InviteCode[] {
  const saved = readLocal<InviteCode[]>("volta.inviteCodes", []);
  if (!saved || saved.length === 0) {
    writeLocal("volta.inviteCodes", DEFAULT_CODES);
    return DEFAULT_CODES;
  }
  return saved;
}

export function saveInviteCodes(codes: InviteCode[]): void {
  writeLocal("volta.inviteCodes", codes);
}

export function generateInviteCode(adminEmail: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const newCode = `VOLTA-${randomPart}-${new Date().getFullYear()}`;
  const codes = getInviteCodes();
  const updated: InviteCode[] = [
    {
      code: newCode,
      createdBy: adminEmail,
      createdAt: Date.now(),
      active: true,
    },
    ...codes,
  ];
  saveInviteCodes(updated);
  return newCode;
}

export function revokeInviteCode(code: string): void {
  const codes = getInviteCodes();
  const updated = codes.map((c) =>
    c.code.toUpperCase() === code.toUpperCase() ? { ...c, active: false } : c,
  );
  saveInviteCodes(updated);
}

export function validateInviteCode(code: string): { valid: boolean; reason?: string } {
  const normalized = code.trim().toUpperCase();
  const codes = getInviteCodes();
  const found = codes.find((c) => c.code.toUpperCase() === normalized);

  if (!found) {
    return { valid: false, reason: "Invalid invite code. Request a code from the owner." };
  }
  if (!found.active) {
    return { valid: false, reason: "This invite code has been revoked." };
  }
  if (found.usedBy) {
    return { valid: false, reason: `This invite code was already redeemed by ${found.usedBy}.` };
  }
  return { valid: true };
}

export function getStoredAccounts(): Record<string, { account: UserAccount; passwordHash: string }> {
  return readLocal<Record<string, { account: UserAccount; passwordHash: string }>>(
    "volta.userAccounts",
    {},
  );
}

export function saveStoredAccounts(
  accounts: Record<string, { account: UserAccount; passwordHash: string }>,
): void {
  writeLocal("volta.userAccounts", accounts);
}

export function registerAccount(params: {
  email: string;
  password: string;
  name: string;
  vehicle: Vehicle;
  display: Display;
  inviteCode?: string;
}): { success: boolean; error?: string; account?: UserAccount } {
  const normalizedEmail = params.email.trim().toLowerCase();
  const isAdmin = isMasterAdmin(normalizedEmail);

  if (!isAdmin) {
    if (!params.inviteCode) {
      return { success: false, error: "An invite code is required to create an account." };
    }
    const check = validateInviteCode(params.inviteCode);
    if (!check.valid) {
      return { success: false, error: check.reason };
    }
  }

  const accounts = getStoredAccounts();
  if (accounts[normalizedEmail]) {
    return { success: false, error: "An account with this email already exists." };
  }

  const userAccount: UserAccount = {
    id: `user-${Date.now()}`,
    email: normalizedEmail,
    name: params.name || (isAdmin ? "Owner" : "Passenger"),
    role: isAdmin ? "admin" : "member",
    vehicle: params.vehicle,
    display: params.display,
    paint: readLocal("volta.paint", 0),
    inviteCodeUsed: isAdmin ? "OWNER-BYPASS" : params.inviteCode?.toUpperCase(),
    createdAt: Date.now(),
  };

  accounts[normalizedEmail] = {
    account: userAccount,
    passwordHash: btoa(params.password),
  };
  saveStoredAccounts(accounts);

  if (!isAdmin && params.inviteCode) {
    const codes = getInviteCodes();
    const updatedCodes = codes.map((c) =>
      c.code.toUpperCase() === params.inviteCode?.trim().toUpperCase()
        ? { ...c, usedBy: normalizedEmail, usedAt: Date.now() }
        : c,
    );
    saveInviteCodes(updatedCodes);
  }

  // Set active user session
  writeLocal("volta.activeUser", userAccount);
  return { success: true, account: userAccount };
}

export function authenticateAccount(
  email: string,
  password: string,
): { success: boolean; error?: string; account?: UserAccount } {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = getStoredAccounts();
  const entry = accounts[normalizedEmail];

  // Auto-provision master admin on first login if not registered yet
  if (!entry && isMasterAdmin(normalizedEmail)) {
    return registerAccount({
      email: normalizedEmail,
      password,
      name: "Tesla Owner (MrGoBeast)",
      vehicle: "Tesla Model 3",
      display: "Center display (parked)",
    });
  }

  if (!entry) {
    return { success: false, error: "Account not found. Please check email or register with an invite." };
  }

  if (entry.passwordHash !== btoa(password)) {
    return { success: false, error: "Incorrect password." };
  }

  writeLocal("volta.activeUser", entry.account);
  return { success: true, account: entry.account };
}

export function getActiveUser(): UserAccount | null {
  return readLocal<UserAccount | null>("volta.activeUser", null);
}

export function logOutActiveUser(): void {
  writeLocal("volta.activeUser", null);
}
