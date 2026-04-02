import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const CATEGORY_COLORS = {
  'Bug / Issue': { bg: '#FEE2E2', color: '#B91C1C' },
  'Feature request': { bg: '#E0F2FE', color: '#0369A1' },
  'Need clarification': { bg: '#FEF3C7', color: '#B45309' },
  'Positive / Good': { bg: '#D1FAE5', color: '#065F46' },
  'Other': { bg: '#F3F4F6', color: '#374151' },
};

const maskEmail = (email) => {
  if (!email) return 'Unknown user';
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
};

function AdminPanel() {
  const [accounts, setAccounts] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [view, setView] = useState('accounts');
  const [inviteCodes, setInviteCodes] = useState({});
  const [generatingInvite, setGeneratingInvite] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null); // feedback id
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [announcing, setAnnouncing] = useState(false);
  const [announced, setAnnounced] = useState({}); // feedbackId -> true
  const [deletingId, setDeletingId] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    const [acctRes, wlRes, fbRes, errRes] = await Promise.all([
      supabase.rpc('get_all_accounts_admin'),
      supabase.rpc('get_waitlist_admin'),
      supabase.rpc('get_feedback_admin'),
      supabase.rpc('get_error_logs_admin'),
    ]);
    const firstError = acctRes.error || wlRes.error || fbRes.error || errRes.error;
    if (firstError) setLoadError(firstError.message);
    setAccounts(acctRes.data || []);
    setWaitlist(wlRes.data || []);
    setFeedback(fbRes.data || []);
    setErrors(errRes.data || []);
    setLoading(false);
  };

  const generateInvite = async (waitlistId) => {
    setGeneratingInvite(waitlistId);
    const { data: code } = await supabase.rpc('generate_invite_code_admin');
    if (code) {
      setInviteCodes((prev) => ({ ...prev, [waitlistId]: code }));
    }
    setGeneratingInvite(null);
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

  const postAnnouncement = async (feedbackId, feedbackEmail) => {
    if (!announceTitle.trim() || !announceBody.trim()) return;
    setAnnouncing(true);

    await supabase.rpc('post_announcement_admin', {
      p_title: announceTitle.trim(),
      p_body: announceBody.trim(),
      p_feedback_id: feedbackId,
    });

    // Email the person who submitted the feedback
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && feedbackEmail) {
        const notifyRes = await fetch('/api/notify-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            toEmail: feedbackEmail,
            title: announceTitle.trim(),
            body: announceBody.trim(),
          }),
        });
        if (!notifyRes.ok) {
          const err = await notifyRes.json().catch(() => ({}));
          setLoadError(`Email failed: ${err.error || notifyRes.status}`);
        }
      }
    } catch (e) {
      setLoadError(`Email error: ${e.message}`);
    }

    setAnnounced((prev) => ({ ...prev, [feedbackId]: true }));
    setRespondingTo(null);
    setAnnounceTitle('');
    setAnnounceBody('');
    setAnnouncing(false);
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Delete this feedback? This cannot be undone.')) return;
    setDeletingId(id);
    await supabase.rpc('delete_feedback_admin', { p_feedback_id: id });
    setFeedback((prev) => prev.filter((f) => f.id !== id));
    setDeletingId(null);
  };

  const setFeedbackStatus = async (id, status) => {
    setStatusUpdating(id);
    await supabase.rpc('set_feedback_status_admin', { p_feedback_id: id, p_status: status });
    setFeedback((prev) => prev.map((f) => f.id === id ? { ...f, status } : f));
    setStatusUpdating(null);
  };

  const togglePublished = async (id, currentPublished) => {
    setPublishingId(id);
    await supabase.rpc('set_feedback_published_admin', { p_feedback_id: id, p_published: !currentPublished });
    setFeedback((prev) => prev.map((f) => f.id === id ? { ...f, is_published: !currentPublished } : f));
    setPublishingId(null);
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

      {loadError && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: '12px', padding: '12px 14px', fontSize: '13px', marginBottom: '12px' }}>
          Error: {loadError}
        </div>
      )}

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>{entry.email}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{formatDate(entry.created_at)}</div>
                {inviteCodes[entry.id] && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700', color: '#1D9E75', background: '#E1F5EE', padding: '4px 10px', borderRadius: '8px', letterSpacing: '0.05em' }}>
                      {inviteCodes[entry.id]}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(inviteCodes[entry.id])}
                      style={{ fontSize: '11px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      copy
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => generateInvite(entry.id)}
                disabled={generatingInvite === entry.id}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: '20px', border: '1.5px solid #ddd',
                  background: inviteCodes[entry.id] ? '#E1F5EE' : '#fafafa',
                  color: inviteCodes[entry.id] ? '#1D9E75' : '#888',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  opacity: generatingInvite === entry.id ? 0.5 : 1,
                }}
              >
                {generatingInvite === entry.id ? '...' : inviteCodes[entry.id] ? 'Regenerate' : 'Generate invite'}
              </button>
            </div>
          </div>
        ))
      ) : view === 'feedback' ? (
        feedback.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', fontSize: '14px', padding: '40px 0' }}>No feedback yet.</div>
        ) : feedback.map((fb) => {
          const catStyle = CATEGORY_COLORS[fb.category] || CATEGORY_COLORS['Other'];
          const isResponding = respondingTo === fb.id;
          const isDone = announced[fb.id];
          const STATUS_OPTIONS = ['planned', 'upcoming', 'launched'];
          const STATUS_STYLES = {
            planned:  { bg: '#E0F2FE', color: '#0369A1' },
            upcoming: { bg: '#FEF3C7', color: '#B45309' },
            launched: { bg: '#D1FAE5', color: '#065F46' },
          };
          return (
            <div key={fb.id} style={{ ...cardStyle, opacity: deletingId === fb.id ? 0.4 : 1 }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#888' }}>{maskEmail(fb.email)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{formatDateTime(fb.created_at)}</div>
                  <button
                    onClick={() => deleteFeedback(fb.id)}
                    disabled={!!deletingId}
                    style={{ fontSize: '13px', color: '#ccc', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Category badge */}
              {fb.category && (
                <div style={{ display: 'inline-block', marginBottom: '8px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: catStyle.bg, color: catStyle.color }}>
                  {fb.category}
                </div>
              )}

              <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', marginBottom: '8px' }}>{fb.message}</div>

              {/* Vote counts */}
              {fb.is_published && (Number(fb.upvotes) > 0 || Number(fb.downvotes) > 0) && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '12px', color: '#888' }}>
                  {Number(fb.upvotes) > 0 && <span>👍 {fb.upvotes}</span>}
                  {Number(fb.downvotes) > 0 && <span>👎 {fb.downvotes}</span>}
                </div>
              )}

              {/* Status + Publish controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map((s) => {
                  const active = fb.status === s;
                  const st = STATUS_STYLES[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setFeedbackStatus(fb.id, active ? null : s)}
                      disabled={statusUpdating === fb.id}
                      style={{
                        padding: '3px 10px', borderRadius: '20px', border: `1.5px solid ${active ? st.color : '#e0e0e0'}`,
                        background: active ? st.bg : 'white', color: active ? st.color : '#aaa',
                        fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                        opacity: statusUpdating === fb.id ? 0.5 : 1,
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
                <button
                  onClick={() => togglePublished(fb.id, fb.is_published)}
                  disabled={publishingId === fb.id}
                  style={{
                    marginLeft: 'auto', padding: '3px 12px', borderRadius: '20px',
                    border: `1.5px solid ${fb.is_published ? '#7C3AED' : '#e0e0e0'}`,
                    background: fb.is_published ? '#F3E8FF' : 'white',
                    color: fb.is_published ? '#7C3AED' : '#aaa',
                    fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                    opacity: publishingId === fb.id ? 0.5 : 1,
                  }}
                >
                  {fb.is_published ? '● Published' : 'Publish'}
                </button>
              </div>

              {/* Announcement section */}
              {isDone ? (
                <div style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '600' }}>✓ Announcement posted</div>
              ) : isResponding ? (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
                  <input
                    placeholder="Title (e.g. 'Shopping list improvement')"
                    value={announceTitle}
                    onChange={(e) => setAnnounceTitle(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px' }}
                  />
                  <textarea
                    placeholder="What did you ship? (visible to all users in What's New)"
                    value={announceBody}
                    onChange={(e) => setAnnounceBody(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical', marginBottom: '8px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => postAnnouncement(fb.id, fb.email)} disabled={announcing} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', background: '#1D9E75', color: 'white', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                      {announcing ? 'Posting...' : 'Post announcement'}
                    </button>
                    <button onClick={() => { setRespondingTo(null); setAnnounceTitle(''); setAnnounceBody(''); }} style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #ddd', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#666' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setRespondingTo(fb.id)} style={{ fontSize: '12px', color: '#E46A2E', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  + Post announcement about this
                </button>
              )}
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
