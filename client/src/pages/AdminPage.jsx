import React, { useState, useEffect } from 'react';
import { Users, UserPlus, KeyRound, UserX, UserCheck, Trash2, Mail, Shield } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/common/ConfirmModal';

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New user form state
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [createError, setCreateError] = useState('');

  // Password reset state
  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users || []);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      await api.post('/admin/users', { name, email, password, role });
      setName('');
      setEmail('');
      setPassword('');
      setIsCreating(false);
      loadUsers();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create user account.');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await api.patch(`/admin/users/${user.id}/status`, { isActive: !user.is_active });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change user status.');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    try {
      await api.patch(`/admin/users/${userId}/password`, { newPassword });
      alert('Password reset successfully.');
      setResetUserId(null);
      setNewPassword('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  const handleDeleteUser = (user) => {
    setConfirmConfig({
      title: 'Delete User Account',
      message: `Delete account "${user.name}" (${user.email})?`,
      detail: 'The user will be deactivated and removed from the active account list.',
      confirmLabel: 'Delete Account',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/admin/users/${user.id}`);
          setConfirmConfig(null);
          loadUsers();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to delete user.');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  return (
    <div className="page-content">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.45rem' }}>User Accounts</h1>
          <p style={{ fontSize: '0.84rem', marginTop: '2px', color: 'var(--color-text-secondary)' }}>
            Manage isolated accounts for your father and administrative access.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setIsCreating(!isCreating)}>
          <UserPlus size={16} />
          <span>{isCreating ? 'Cancel' : 'New Account'}</span>
        </button>
      </div>

      {/* New Account Creation Card */}
      {isCreating && (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Create New Account</h3>

          {createError && (
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--color-danger-subtle)',
                color: 'var(--color-danger)',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '14px'
              }}
            >
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Gebeyaw (Work Archive)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="father.work@filemanager.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="user">User (Father)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List Table */}
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading accounts...</p>
      ) : (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xs)'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px' }}>User</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Last Login</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-accent' : 'badge-muted'}`}>
                        {u.role === 'admin' ? <Shield size={11} /> : null}
                        <span>{u.role}</span>
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${u.is_active ? 'badge-forest' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleDateString()
                        : 'Never'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setResetUserId(resetUserId === u.id ? null : u.id)}
                          title="Reset Password"
                        >
                          <KeyRound size={15} />
                        </button>

                        {u.id !== currentUser?.id && (
                          <>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleToggleStatus(u)}
                              title={u.is_active ? 'Deactivate account' : 'Activate account'}
                            >
                              {u.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                            </button>

                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={() => handleDeleteUser(u)}
                              title="Delete account"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Inline password reset row */}
                      {resetUserId === u.id && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <input
                            type="password"
                            placeholder="New password (min 8)"
                            className="form-input"
                            style={{ width: '180px', padding: '4px 8px', fontSize: '0.82rem' }}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <button className="btn btn-primary btn-sm" onClick={() => handleResetPassword(u.id)}>
                            Save
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        onConfirm={confirmConfig?.onConfirm}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        detail={confirmConfig?.detail}
        confirmLabel={confirmConfig?.confirmLabel}
        confirmVariant={confirmConfig?.confirmVariant}
        loading={actionLoading}
      />
    </div>
  );
}
