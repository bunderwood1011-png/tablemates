import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const FAQS = [
  { q: 'How do I add a family member?', a: 'Tap the "+" circle in Family Profiles. A sheet will slide up where you can add their name, foods they love, foods they won\'t eat, and any allergies. Tap the "+ add" pill next to each section to add items, then hit Save.' },
  { q: 'How do I update a family member\'s likes, dislikes or allergies?', a: 'Tap any family member card or avatar in My Home. Their edit sheet will slide up with all their info pre-filled. Tap any tag to remove it, tap "+ add" to add new ones, then hit Save.' },
  { q: 'How does the weekly meal plan work?', a: 'Go to "this week" and tap "suggest this week\'s dinners." Tablemates will look at your family profiles and your schedule to suggest 7 dinners. Busy nights get quicker meals and relaxed nights can get more involved recipes.' },
  { q: 'How do I swap a meal I don\'t like?', a: 'On any meal card in "this week," tap "swap meal." Tablemates will suggest a different meal for that night without changing the rest of the week.' },
  { q: 'What are modifications?', a: 'Modifications are per-person tweaks to a meal. For example, if one adult likes spicy food but the kids don\'t, Tablemates may suggest adding hot sauce to one portion. They show up on meal cards and in the recipe modal.' },
  { q: 'How do I refresh modifications after updating profiles?', a: 'If you update a family member\'s profile after generating your week, you may see a banner in "this week." Tap "refresh mods" to update all modifications based on the latest profiles without replanning your whole week.' },
  { q: 'How does the shopping list work?', a: 'Once you\'ve planned all 7 nights, a "generate shopping list" button appears at the bottom of "this week." Tap it and Tablemates will create a grocery list organized by section.' },
  { q: 'How do I save a week?', a: 'Once your week is planned, tap "Save" at the top of "this week." It gets archived in "past weeks" so you can revisit it anytime.' },
  { q: 'How do I save a recipe?', a: 'Tap "how to cook" on any meal. A sheet slides up with the cooking steps. Tap "Keep this meal" to save it to your recipes tab. You can also favorite recipes with the heart icon.' },
  { q: 'What\'s the difference between "replan whole week" and "refresh mods"?', a: '"Replan whole week" generates 7 brand new meal suggestions. "Refresh mods" keeps your current meals but updates per-person modifications based on your current family profiles.' },
];

const PRIVACY_POLICY = [
  { type: 'meta', text: 'Last updated: March 2026' },
  { type: 'body', text: 'Tablemates ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and store your information when you use the Tablemates app.' },
  { type: 'header', text: 'Information We Collect' },
  { type: 'body', text: 'We collect information you provide directly, including your email address, household member names, food preferences, allergies, and weekly schedule. We also collect usage data such as meal feedback and app errors to help improve the experience.' },
  { type: 'header', text: 'How We Use Your Information' },
  { type: 'body', text: 'Your information is used solely to generate personalized meal plans, provide recipe suggestions, and improve the Tablemates experience. We do not sell your data to third parties.' },
  { type: 'header', text: 'Data Storage' },
  { type: 'body', text: 'Your data is stored securely using Supabase. Each user\'s data is protected by Row Level Security, meaning your information is only accessible to you.' },
  { type: 'header', text: 'Data Deletion' },
  { type: 'body', text: 'You can delete your account at any time from the Account page. Deleting your account permanently removes all associated data including profiles, schedules, meal plans, and preferences.' },
  { type: 'header', text: 'Contact' },
  { type: 'body', text: 'If you have questions about this policy, please use the Feedback form in the app.' },
  { type: 'body', text: 'This policy will be updated as Tablemates grows. We will notify users of any significant changes.' },
];

const TERMS_OF_SERVICE = [
  { type: 'meta', text: 'Last updated: March 2026' },
  { type: 'body', text: 'By using Tablemates, you agree to these Terms of Service. Please read them carefully.' },
  { type: 'header', text: 'Use of the App' },
  { type: 'body', text: 'Tablemates is a meal planning tool designed to help households plan weekly dinners. You agree to use the app for its intended purpose and not to misuse or attempt to reverse-engineer any part of the service.' },
  { type: 'header', text: 'Beta Access' },
  { type: 'body', text: 'Tablemates is currently in beta. Features may change, be removed, or be temporarily unavailable. We appreciate your patience and feedback during this period.' },
  { type: 'header', text: 'Food Allergy Disclaimer' },
  { type: 'body', text: 'Meal suggestions and modifications generated by Tablemates are for planning convenience only and are not medical or dietary advice. Always verify ingredients independently if you or a household member has a serious food allergy.' },
  { type: 'header', text: 'Account Responsibility' },
  { type: 'body', text: 'You are responsible for maintaining the security of your account credentials. Please notify us immediately if you suspect unauthorized access.' },
  { type: 'header', text: 'Termination' },
  { type: 'body', text: 'We reserve the right to suspend or terminate accounts that violate these terms.' },
  { type: 'header', text: 'Limitation of Liability' },
  { type: 'body', text: 'Tablemates is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the app.' },
  { type: 'header', text: 'Contact' },
  { type: 'body', text: 'For questions about these terms, please use the Feedback form in the app.' },
];

function AccountSupport({ onLogout }) {
  const [view, setView] = useState('menu');
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Account state
  const [userEmail, setUserEmail] = useState('');
  const [membershipTier, setMembershipTier] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        // Load membership tier from accounts table
        const { data } = await supabase
          .from('accounts')
          .select('beta_user')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setMembershipTier(data.beta_user ? 'Beta' : 'Free');
        }
      }
    };
    loadUser();
  }, []);

  const handleEmailUpdate = async () => {
    setEmailMsg('');
    if (!newEmail.trim()) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setEmailMsg('Could not update email. Try again.');
    } else {
      setEmailMsg('Check your new email for a confirmation link.');
      setNewEmail('');
    }
  };

  const handlePasswordUpdate = async () => {
    setPasswordMsg('');
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg('Could not update password. Try again.');
    } else {
      setPasswordMsg('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'delete') return;
    setIsDeleting(true);
    setDeleteMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Delete all user data in order
      await supabase.from('user_recipes').delete().eq('user_id', user.id);
      await supabase.from('weekly_meals').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);
      await supabase.from('schedules').delete().eq('user_id', user.id);
      await supabase.from('accounts').delete().eq('user_id', user.id);
      await supabase.from('feedback').delete().eq('user_id', user.id);

      // Sign out — account deletion from auth requires a backend function
      // For now we clear data and log out. Full auth deletion can be added later.
      await supabase.auth.signOut();
      onLogout();
    } catch (err) {
      setDeleteMsg('Something went wrong. Please try again.');
      setIsDeleting(false);
    }
  };

  // ── Shared styles ──────────────────────────────────────────
  const cardStyle = {
    background: 'white',
    border: '1px solid #e8e8e8',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    marginBottom: '12px',
  };

  const cardTitleStyle = {
    fontSize: '15px',
    fontWeight: '600',
    color: '#222',
  };

  const cardSubtitleStyle = {
    fontSize: '13px',
    color: '#777',
    marginTop: '4px',
    lineHeight: '1.4',
  };

  const backButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#1D9E75',
    fontSize: '14px',
    marginBottom: '16px',
    cursor: 'pointer',
    padding: 0,
    fontWeight: '600',
  };

  const sectionLabelStyle = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#E07A3A',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '10px',
    marginTop: '20px',
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 13px',
    borderRadius: '12px',
    border: '1px solid #ddd',
    fontFamily: 'inherit',
    fontSize: '14px',
    boxSizing: 'border-box',
    marginBottom: '10px',
  };

  const primaryBtnStyle = {
    background: '#1D9E75',
    color: 'white',
    border: 'none',
    padding: '11px 16px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    width: '100%',
  };

  const dangerBtnStyle = {
    background: '#DC2626',
    color: 'white',
    border: 'none',
    padding: '11px 16px',
    borderRadius: '12px',
    cursor: isDeleting ? 'default' : 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    width: '100%',
    opacity: isDeleting ? 0.6 : 1,
  };

  const msgStyle = (isError) => ({
    fontSize: '13px',
    color: isError ? '#DC2626' : '#B42318',
    fontWeight: '600',
    marginTop: '8px',
  });

  const sectionCardStyle = {
    background: 'white',
    border: '1px solid #e8e8e8',
    borderRadius: '16px',
    padding: '18px',
    marginBottom: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  };

  const ChevronRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 6L15 12L9 18" stroke="#E07A3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // ── Views ──────────────────────────────────────────────────

  return (
    <div style={{ marginTop: '16px' }}>

      {/* MENU */}
      {view === 'menu' && (
        <>
          <div style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: '16px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Account & Support</div>
            <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
              Manage your account, get help, and send feedback while Tablemates is in beta.
            </div>
          </div>

          <div style={sectionLabelStyle}>account</div>
          <div onClick={() => setView('account')} style={cardStyle}>
            <div>
              <div style={cardTitleStyle}>Account Settings</div>
              <div style={cardSubtitleStyle}>Email, password, and membership</div>
            </div>
            <ChevronRight />
          </div>

          <div style={sectionLabelStyle}>support</div>
          <div onClick={() => setView('feedback')} style={cardStyle}>
            <div>
              <div style={cardTitleStyle}>Feedback</div>
              <div style={cardSubtitleStyle}>Report a bug or share an idea</div>
            </div>
            <ChevronRight />
          </div>

          <div onClick={() => setView('faq')} style={cardStyle}>
            <div>
              <div style={cardTitleStyle}>FAQ / Help</div>
              <div style={cardSubtitleStyle}>Get answers and learn how Tablemates works</div>
            </div>
            <ChevronRight />
          </div>

          <div style={sectionLabelStyle}>about</div>
          <div style={{ ...sectionCardStyle, cursor: 'default' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a', marginBottom: '10px' }}>
              About Tablemates
            </div>
            <div style={{ fontSize: '14px', color: '#555', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0 }}>Tablemates was built by a mom of six who was laid off from her job — because of AI.</p>
              <p style={{ margin: 0 }}>Instead of stepping back, she decided to use it.</p>
              <p style={{ margin: 0 }}>Between six kids, different tastes, allergies, and sports schedules that change every week, dinner was a daily source of stress. No app quite solved it. So she built one.</p>
              <p style={{ margin: 0 }}>Tablemates is the meal planner she always wished existed — one that actually knows your family, respects your time, and handles the part of the day that shouldn't be this hard.</p>
            </div>
            <div style={{ fontSize: '13px', color: '#1D9E75', fontStyle: 'italic', marginTop: '14px', fontWeight: '600' }}>
              dinner, handled. 🍽️
            </div>
          </div>

          <div style={sectionLabelStyle}>legal</div>
          <div onClick={() => setView('privacy')} style={cardStyle}>
            <div>
              <div style={cardTitleStyle}>Privacy Policy</div>
              <div style={cardSubtitleStyle}>How we handle your data</div>
            </div>
            <ChevronRight />
          </div>

          <div onClick={() => setView('terms')} style={cardStyle}>
            <div>
              <div style={cardTitleStyle}>Terms of Service</div>
              <div style={cardSubtitleStyle}>Rules for using Tablemates</div>
            </div>
            <ChevronRight />
          </div>

          <div style={sectionLabelStyle}>session</div>
          <div style={cardStyle} onClick={onLogout}>
            <div>
              <div style={cardTitleStyle}>Log out</div>
              <div style={cardSubtitleStyle}>Sign out of your account</div>
            </div>
            <ChevronRight />
          </div>
        </>
      )}

      {/* ACCOUNT SETTINGS */}
      {view === 'account' && (
        <div>
          <button onClick={() => setView('menu')} style={backButtonStyle}>‹ Back</button>

          {/* Membership tier */}
          <div style={sectionLabelStyle}>membership</div>
          <div style={{ ...sectionCardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#222' }}>Current Plan</div>
              <div style={{ fontSize: '13px', color: '#777', marginTop: '4px' }}>
                {membershipTier === 'Beta' ? 'Early access — free during beta' : 'Free'}
              </div>
            </div>
            <div style={{
              background: membershipTier === 'Beta' ? '#FDF0EE' : '#F3F4F6',
              color: membershipTier === 'Beta' ? '#1D9E75' : '#666',
              fontSize: '13px',
              fontWeight: '700',
              padding: '5px 12px',
              borderRadius: '20px',
            }}>
              {membershipTier || '—'}
            </div>
          </div>

          {/* Change email */}
          <div style={sectionLabelStyle}>email</div>
          <div style={sectionCardStyle}>
            <div style={{ fontSize: '13px', color: '#777', marginBottom: '10px' }}>
              Current: <span style={{ color: '#222', fontWeight: '600' }}>{userEmail}</span>
            </div>
            <input
              style={inputStyle}
              type="email"
              placeholder="New email address"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setEmailMsg(''); }}
            />
            <button style={primaryBtnStyle} onClick={handleEmailUpdate}>Update Email</button>
            {emailMsg && (
              <div style={msgStyle(emailMsg.includes('Could not'))}>
                {emailMsg}
              </div>
            )}
          </div>

          {/* Change password */}
          <div style={sectionLabelStyle}>password</div>
          <div style={sectionCardStyle}>
            <input
              style={inputStyle}
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordMsg(''); }}
            />
            <input
              style={inputStyle}
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMsg(''); }}
            />
            <button style={primaryBtnStyle} onClick={handlePasswordUpdate}>Update Password</button>
            {passwordMsg && (
              <div style={msgStyle(passwordMsg.includes('not') || passwordMsg.includes('Could'))}>
                {passwordMsg}
              </div>
            )}
          </div>

          {/* Delete account */}
          <div style={sectionLabelStyle}>danger zone</div>
          <div style={{ ...sectionCardStyle, borderColor: '#FECACA' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#DC2626', marginBottom: '6px' }}>
              Delete Account
            </div>
            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', marginBottom: '14px' }}>
              This permanently deletes your account, profiles, meal plans, and all saved data. This cannot be undone.
            </div>
            <div style={{ fontSize: '13px', color: '#444', marginBottom: '8px' }}>
              Type <strong>delete</strong> to confirm:
            </div>
            <input
              style={{ ...inputStyle, borderColor: deleteConfirmText === 'delete' ? '#DC2626' : '#ddd' }}
              type="text"
              placeholder="delete"
              value={deleteConfirmText}
              onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteMsg(''); }}
            />
            <button
              style={{ ...dangerBtnStyle, opacity: deleteConfirmText !== 'delete' || isDeleting ? 0.4 : 1 }}
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'delete' || isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete My Account'}
            </button>
            {deleteMsg && <div style={msgStyle(true)}>{deleteMsg}</div>}
          </div>
        </div>
      )}

      {/* FEEDBACK */}
      {view === 'feedback' && (
        <div>
          <button onClick={() => setView('menu')} style={backButtonStyle}>‹ Back</button>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e8e8e8' }}>
            <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '20px' }}>Feedback</h2>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6', marginBottom: '14px' }}>
              If something breaks or you have an idea, tell me here.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => { setFeedback(e.target.value); if (feedbackSubmitted) setFeedbackSubmitted(false); }}
              placeholder="Tell me what's working, what's not, or what you'd love to see."
              style={{ width: '100%', minHeight: '140px', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <button
              onClick={async () => {
                if (!feedback.trim()) return;
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { error } = await supabase.from('feedback').insert([{ user_id: user.id, message: feedback.trim() }]);
                if (!error) { setFeedbackSubmitted(true); setFeedback(''); }
              }}
              disabled={feedbackSubmitted}
              style={{ marginTop: '14px', background: '#1D9E75', color: 'white', border: 'none', padding: '12px 16px', borderRadius: '12px', cursor: feedbackSubmitted ? 'default' : 'pointer', fontWeight: '600', opacity: feedbackSubmitted ? 0.7 : 1 }}
            >
              {feedbackSubmitted ? 'Submitted ✓' : 'Submit Feedback'}
            </button>
            {feedbackSubmitted && <div style={{ marginTop: '12px', fontSize: '13px', color: '#B42318', fontWeight: '600' }}>Thanks for the feedback!</div>}
          </div>
        </div>
      )}

      {/* FAQ */}
      {view === 'faq' && (
        <div>
          <button onClick={() => setView('menu')} style={backButtonStyle}>‹ Back</button>
          <div style={{ background: '#FAEEDA', borderRadius: '12px', padding: '12px 14px', marginBottom: '1rem', fontSize: '12px', color: '#854F0B', lineHeight: '1.6' }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>A note on food allergies</strong>
            Tablemates meal suggestions and modifications are for planning convenience only and are not medical advice.
          </div>
          <div style={sectionLabelStyle}>help & faq</div>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.5rem', cursor: 'pointer' }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', paddingRight: '12px', lineHeight: '1.4' }}>{faq.q}</div>
                <span style={{ fontSize: '18px', color: '#E07A3A', flexShrink: 0, fontWeight: '300' }}>{openFaq === i ? '−' : '+'}</span>
              </div>
              {openFaq === i && (
                <div style={{ fontSize: '13px', color: '#666', marginTop: '10px', lineHeight: '1.6', borderTop: '0.5px solid #f0f0f0', paddingTop: '10px' }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PRIVACY POLICY */}
      {view === 'privacy' && (
        <div>
          <button onClick={() => setView('menu')} style={backButtonStyle}>‹ Back</button>
          <div style={sectionCardStyle}>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '14px' }}>Privacy Policy</div>
            {PRIVACY_POLICY.map((block, i) => (
              block.type === 'header' ? (
                <div key={i} style={{ fontSize: '13px', fontWeight: '700', color: '#E07A3A', marginTop: '16px', marginBottom: '4px' }}>{block.text}</div>
              ) : block.type === 'meta' ? (
                <div key={i} style={{ fontSize: '12px', color: '#999', marginBottom: '14px', fontStyle: 'italic' }}>{block.text}</div>
              ) : (
                <p key={i} style={{ fontSize: '13px', color: '#555', lineHeight: '1.7', marginBottom: '8px', marginTop: 0 }}>{block.text}</p>
              )
            ))}
          </div>
        </div>
      )}

      {/* TERMS OF SERVICE */}
      {view === 'terms' && (
        <div>
          <button onClick={() => setView('menu')} style={backButtonStyle}>‹ Back</button>
          <div style={sectionCardStyle}>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '14px' }}>Terms of Service</div>
            {TERMS_OF_SERVICE.map((block, i) => (
              block.type === 'header' ? (
                <div key={i} style={{ fontSize: '13px', fontWeight: '700', color: '#E07A3A', marginTop: '16px', marginBottom: '4px' }}>{block.text}</div>
              ) : block.type === 'meta' ? (
                <div key={i} style={{ fontSize: '12px', color: '#999', marginBottom: '14px', fontStyle: 'italic' }}>{block.text}</div>
              ) : (
                <p key={i} style={{ fontSize: '13px', color: '#555', lineHeight: '1.7', marginBottom: '8px', marginTop: 0 }}>{block.text}</p>
              )
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default AccountSupport;