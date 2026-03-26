import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const CATEGORY_COLORS = {
  'Bug / Issue': { bg: '#FEE2E2', color: '#B91C1C' },
  'Feature request': { bg: '#E0F2FE', color: '#0369A1' },
  'Need clarification': { bg: '#FEF3C7', color: '#B45309' },
  'Positive / Good': { bg: '#D1FAE5', color: '#065F46' },
  'Other': { bg: '#F3F4F6', color: '#374151' },
};

function AdminPanel() {
  const [accounts, setAccounts] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [view, setView] = useState('accounts');

  const load = async () => {
    setLoading(true);
    const [{ data: accts }, { data: wl }, { data: fb }, { data: errs }] = await Promise.all([
      supabase.rpc('get_all_accounts_admin'),
      supabase.rpc('get_waitlist_admin'),
      supabase.rpc('get_feedback_admin'),
      supabase.rpc('get_error_logs_admin'),
    ]);
    setAccounts(accts || []);
    setWaitlist(wl || []);
    setFeedback(fb || []);
    setErrors(errs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleBeta = async (userId, currentValue) => {
    setTogglingId(userId);
    await supabase.rpc('set_beta_user', { target_user_id: userId, beta_value: !currentValue });
    setAccounts((prev) =>
      prev.map((a) => a.user_id === userId ? { ...a, beta_user: !currentValue } : a)
    );
    setTogglingId(null);
  };

  const betaCount = accounts.filter((a) => a.beta_user).length;
  const referralCount = accounts.filter((a) => a.referred_by).length;

  const formatDate = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const cardStyle = {
    background: 'white',
    border: '1px solid #e8e8e8',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  };

  const TABS = [
    { key: 'accounts', label: `Users (${accounts.length})` },
    { key: 'waitlist', label: `Waitlist (${waitlist.length})` },
    { key: 'feedback', label: `Feedback (${feedback.length})` },
    { key: 'errors', label: `Errors (${errors.length})` },
  ];

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            🔐
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em' }}>Admin</div>
        </div>
        <div style={{ fontSize: '14px', color: '#6B6B6B', lineHeight: '1.6' }}>
          Manage users, review feedback, and monitor errors.
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total users', value: accounts.length },
          { label: 'Beta users', value: betaCount },
          { label: 'Via referral', value: referralCount },
          { label: 'Waitlist', value: waitlist.length },
          { label: 'Feedback', value: feedback.length },
          { label: 'Errors', value: errors.length },
        ].map((stat) => (
          <div key={stat.label} style={{ flex: '1 1 calc(33% - 8px)', background: 'white', border: '1px solid #e8e8e8', borderRadius: '14px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#1D9E75' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: '12px', border: 'none',
              background: view === tab.key ? '#1D9E75' : '#eef0ee',
              color: view === tab.key ? 'white' : '#666',
              fontWeight: '600', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', fontSize: '14px', padding: '40px 0' }}>Loading...</div>
      ) : view === 'accounts' ? (
        accounts.map((acct) => (
          <div key={acct.user_id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acct.email}
                  {acct.is_admin && <span style={{ marginLeft: '6px', fontSize: '11px', background: '#F3E8FF', color: '#7C3AED', borderRadius: '6px', padding: '2px 6px', fontWeight: '700' }}>admin</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#999', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span>Joined {formatDate(acct.created_at)}</span>
                  {acct.referred_by && <span style={{ color: '#1D9E75' }}>via referral</span>}
                  {acct.referral_code && <span>code: {acct.referral_code}</span>}
                </div>
              </div>
              <button
                onClick={() => toggleBeta(acct.user_id, acct.beta_user)}
                disabled={togglingId === acct.user_id || acct.is_admin}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: '20px', border: '1.5px solid',
                  borderColor: acct.beta_user ? '#1D9E75' : '#ddd',
                  background: acct.beta_user ? '#E1F5EE' : '#fafafa',
                  color: acct.beta_user ? '#1D9E75' : '#888',
                  fontSize: '12px', fontWeight: '700',
                  cursor: acct.is_admin ? 'default' : 'pointer',
                  opacity: togglingId === acct.user_id ? 0.5 : 1,
                }}
              >
                {acct.beta_user ? 'Beta ✓' : 'Grant beta'}
              </button>
            </div>
          </div>
        ))
      ) : view === 'waitlist' ? (
        waitlist.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', fontSize: '14px', padding: '40px 0' }}>No waitlist entries yet.</div>
        ) : waitlist.map((entry) => (
          <div key={entry.id} style={cardStyle}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>{entry.email}</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{formatDate(entry.created_at)}</div>
          </div>
        ))
      ) : view === 'feedback' ? (
        feedback.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', fontSize: '14px', padding: '40px 0' }}>No feedback yet.</div>
        ) : feedback.map((fb) => {
          const catStyle = CATEGORY_COLORS[fb.category] || CATEGORY_COLORS['Other'];
          return (
            <div key={fb.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#888' }}>{fb.email || 'Unknown user'}</div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>{formatDateTime(fb.created_at)}</div>
              </div>
              {fb.category && (
                <div style={{ display: 'inline-block', marginBottom: '8px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: catStyle.bg, color: catStyle.color }}>
                  {fb.category}
                </div>
              )}
              <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>{fb.message}</div>
            </div>
          );
        })
      ) : (
        errors.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', fontSize: '14px', padding: '40px 0' }}>No errors logged yet.</div>
        ) : errors.map((err) => (
          <div key={err.id} style={{ ...cardStyle, borderLeft: '3px solid #FCA5A5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#B91C1C' }}>{err.error_type}</div>
              <div style={{ fontSize: '11px', color: '#aaa' }}>{formatDateTime(err.created_at)}</div>
            </div>
            {err.error_message && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>{err.error_message}</div>}
            {err.context && <div style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>{err.context}</div>}
          </div>
        ))
      )}
    </div>
  );
}

export default AdminPanel;
