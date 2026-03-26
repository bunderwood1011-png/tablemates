import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function AdminPanel() {
  const [accounts, setAccounts] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [view, setView] = useState('accounts'); // 'accounts' | 'waitlist'

  const load = async () => {
    setLoading(true);
    const [{ data: accts }, { data: wl }] = await Promise.all([
      supabase.rpc('get_all_accounts_admin'),
      supabase.rpc('get_waitlist_admin'),
    ]);
    setAccounts(accts || []);
    setWaitlist(wl || []);
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

  const cardStyle = {
    background: 'white',
    border: '1px solid #e8e8e8',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            🔐
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', letterSpacing: '-0.02em' }}>
            Admin
          </div>
        </div>
        <div style={{ fontSize: '14px', color: '#6B6B6B', lineHeight: '1.6' }}>
          Manage users, grant beta access, and view the waitlist.
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Total users', value: accounts.length },
          { label: 'Beta users', value: betaCount },
          { label: 'Via referral', value: referralCount },
          { label: 'Waitlist', value: waitlist.length },
        ].map((stat) => (
          <div key={stat.label} style={{ flex: 1, background: 'white', border: '1px solid #e8e8e8', borderRadius: '14px', padding: '14px 12px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['accounts', 'waitlist'].map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            style={{
              flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
              background: view === tab ? '#1D9E75' : '#eef0ee',
              color: view === tab ? 'white' : '#666',
              fontWeight: '600', fontSize: '13px', cursor: 'pointer',
            }}
          >
            {tab === 'accounts' ? `Users (${accounts.length})` : `Waitlist (${waitlist.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', fontSize: '14px', padding: '40px 0' }}>Loading...</div>
      ) : view === 'accounts' ? (
        <>
          {accounts.map((acct) => (
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
                    flexShrink: 0,
                    padding: '7px 14px',
                    borderRadius: '20px',
                    border: '1.5px solid',
                    borderColor: acct.beta_user ? '#1D9E75' : '#ddd',
                    background: acct.beta_user ? '#E1F5EE' : '#fafafa',
                    color: acct.beta_user ? '#1D9E75' : '#888',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: acct.is_admin ? 'default' : 'pointer',
                    opacity: togglingId === acct.user_id ? 0.5 : 1,
                  }}
                >
                  {acct.beta_user ? 'Beta ✓' : 'Grant beta'}
                </button>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {waitlist.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', fontSize: '14px', padding: '40px 0' }}>No waitlist entries yet.</div>
          ) : waitlist.map((entry) => (
            <div key={entry.id} style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>{entry.email}</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Joined {formatDate(entry.created_at)}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default AdminPanel;
