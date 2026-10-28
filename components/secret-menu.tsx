"use client";

import { useEffect, useState } from "react";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  Users,
  X,
  Crown,
  Sparkles,
} from "lucide-react";
import {
  MASTER_ADMIN_EMAIL,
  InviteCode,
  getInviteCodes,
  generateInviteCode,
  revokeInviteCode,
  getStoredAccounts,
  UserAccount,
} from "@/lib/accounts";

export default function SecretMenu({
  onClose,
}: {
  onClose: () => void;
}) {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [createdBanner, setCreatedBanner] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  function refreshData() {
    setCodes(getInviteCodes());
    const stored = getStoredAccounts();
    const list = Object.values(stored).map((entry) => entry.account);
    setAccounts(list);
  }

  function handleCreateCode() {
    const newCode = generateInviteCode(MASTER_ADMIN_EMAIL);
    refreshData();
    setCreatedBanner(newCode);
    handleCopy(newCode);
    setTimeout(() => setCreatedBanner(null), 4000);
  }

  function handleCopy(code: string) {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  }

  function handleRevoke(code: string) {
    revokeInviteCode(code);
    refreshData();
  }

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="secret-menu-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-modal-btn" onClick={onClose} aria-label="Close Secret Menu">
          <X size={20} />
        </button>

        {/* Vault Header */}
        <div className="secret-vault-header">
          <div className="vault-crown-badge">
            <Crown size={28} className="crown-icon" />
          </div>
          <div className="vault-header-text">
            <div className="vault-tag-row">
              <span className="owner-badge">
                <Sparkles size={12} />
                <span>OWNER ACCESS</span>
              </span>
              <span className="email-badge">{MASTER_ADMIN_EMAIL}</span>
            </div>
            <h2>Secret Vault & Invite Manager</h2>
            <p>
              Generate exclusive invite codes to grant friends or passengers access to Volta.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="vault-quick-actions">
          <button className="generate-code-btn" onClick={handleCreateCode}>
            <Plus size={18} />
            <span>Generate New Invite Code</span>
          </button>
        </div>

        {createdBanner && (
          <div className="code-created-banner">
            <Check size={18} />
            <span>Generated & Copied to Clipboard: <strong>{createdBanner}</strong></span>
          </div>
        )}

        {/* Codes List Section */}
        <div className="vault-section">
          <div className="section-title-row">
            <h4>
              <KeyRound size={16} />
              <span>Active & Redeemed Invite Codes ({codes.length})</span>
            </h4>
          </div>

          <div className="codes-list-container">
            {codes.map((item) => (
              <div
                key={item.code}
                className={`code-card ${!item.active ? "revoked" : item.usedBy ? "used" : "active"}`}
              >
                <div className="code-left">
                  <span className="code-string">{item.code}</span>
                  <div className="code-status-pill">
                    {!item.active ? (
                      <span className="status-revoked">Revoked</span>
                    ) : item.usedBy ? (
                      <span className="status-used">Redeemed by {item.usedBy}</span>
                    ) : (
                      <span className="status-active">Available</span>
                    )}
                  </div>
                </div>

                <div className="code-right">
                  <button
                    className="copy-code-btn"
                    onClick={() => handleCopy(item.code)}
                    title="Copy invite code"
                  >
                    {copiedCode === item.code ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedCode === item.code ? "Copied!" : "Copy"}</span>
                  </button>

                  {item.active && !item.usedBy && (
                    <button
                      className="revoke-code-btn"
                      onClick={() => handleRevoke(item.code)}
                      title="Revoke code"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Registered Users Section */}
        <div className="vault-section">
          <div className="section-title-row">
            <h4>
              <Users size={16} />
              <span>Registered Accounts ({accounts.length})</span>
            </h4>
          </div>

          <div className="users-table-container">
            {accounts.length === 0 ? (
              <p className="empty-text">No passenger accounts registered yet.</p>
            ) : (
              <div className="users-list">
                {accounts.map((user) => (
                  <div key={user.id} className="user-row-card">
                    <div className="user-meta">
                      <strong>{user.name}</strong>
                      <span className="user-email">{user.email}</span>
                    </div>
                    <div className="user-badges">
                      <span className="role-chip">{user.role}</span>
                      <span className="vehicle-chip">{user.vehicle}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
