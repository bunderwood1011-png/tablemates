import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const FAQS = [
  { q: 'How do I add a family member?', a: 'Tap the "+" circle in Family Profiles. A sheet will slide up where you can add their name, foods they love, foods they won’t eat, and any allergies. Tap the "+ add" pill next to each section to add items, then hit Save.' },
  { q: 'How do I update a family member\'s likes, dislikes or allergies?', a: 'Tap any family member card or avatar in My Home. Their edit sheet will slide up with all their info pre-filled. Tap any tag to remove it, tap "+ add" to add new ones, then hit Save.' },
  { q: 'How does the weekly meal plan work?', a: 'Go to "this week" and tap "suggest this week’s dinners." Tablemates will look at your family profiles and your schedule to suggest 7 dinners. Busy nights get quicker meals and relaxed nights can get more involved recipes.' },
  { q: 'How do I swap a meal I don’t like?', a: 'On any meal card in "this week," tap "swap meal." Tablemates will suggest a different meal for that night without changing the rest of the week.' },
  { q: 'What are modifications?', a: 'Modifications are per-person tweaks to a meal. For example, if one adult likes spicy food but the kids don’t, Tablemates may suggest adding hot sauce to one portion. They show up on meal cards and in the recipe modal.' },
  { q: 'How do I refresh modifications after updating profiles?', a: 'If you update a family member’s profile after generating your week, you may see a banner in "this week." Tap "refresh mods" to update all modifications based on the latest profiles without replanning your whole week.' },
  { q: 'How does the shopping list work?', a: 'Once you’ve planned all 7 nights, a "generate shopping list" button appears at the bottom of "this week." Tap it and Tablemates will create a grocery list organized by section.' },
  { q: 'How do I save a week?', a: 'Once your week is planned, tap "Save" at the top of "this week." It gets archived in "past weeks" so you can revisit it anytime.' },
  { q: 'How do I save a recipe?', a: 'Tap "how to cook" on any meal. A sheet slides up with the cooking steps. Tap "Keep this meal" to save it to your recipes tab. You can also favorite recipes with the heart icon.' },
  { q: 'What’s the difference between "replan whole week" and "refresh mods"?', a: '"Replan whole week" generates 7 brand new meal suggestions. "Refresh mods" keeps your current meals but updates per-person modifications based on your current family profiles.' },
];

function AccountSupport({ onLogout }) {
  const [view, setView] = useState('menu');
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('No user found:', userError);
      alert('Could not find logged-in user');
      return;
    }

    const { error } = await supabase.from('feedback').insert([
      {
        user_id: user.id,
        message: feedback.trim(),
      },
    ]);

    if (!error) {
      setFeedbackSubmitted(true);
      setFeedback('');
    } else {
      alert('Feedback did not save. Check console.');
    }
  };

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

  const ChevronRight = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 6L15 12L9 18"
        stroke="#9A9A9A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div style={{ marginTop: '16px' }}>
      {view === 'menu' && (
        <>
          <div
            style={{
              background: 'white',
              border: '1px solid #e8e8e8',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>
              Account & Support
            </div>
            <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
              Manage your account, get help, and send feedback while Tablemates is in beta.
            </div>
          </div>

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

          <div style={cardStyle} onClick={onLogout}>
            <div>
              <div style={cardTitleStyle}>Log out</div>
              <div style={cardSubtitleStyle}>Sign out of your account</div>
            </div>
            <ChevronRight />
          </div>
        </>
      )}

      {view === 'feedback' && (
        <div>
          <button onClick={() => setView('menu')} style={backButtonStyle}>
            ‹ Back
          </button>

          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #e8e8e8',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '20px' }}>
              Feedback
            </h2>

            <p
              style={{
                fontSize: '14px',
                color: '#666',
                lineHeight: '1.6',
                marginBottom: '14px',
              }}
            >
              If something breaks or you have an idea, tell me here.
            </p>

            <textarea
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (feedbackSubmitted) setFeedbackSubmitted(false);
              }}
              placeholder="Tell me what's working, what's not, or what you'd love to see."
              style={{
                width: '100%',
                minHeight: '140px',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #ddd',
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />

            <button
              onClick={handleFeedbackSubmit}
              disabled={feedbackSubmitted}
              style={{
                marginTop: '14px',
                background: '#1D9E75',
                color: 'white',
                border: 'none',
                padding: '12px 16px',
                borderRadius: '12px',
                cursor: feedbackSubmitted ? 'default' : 'pointer',
                fontWeight: '600',
                opacity: feedbackSubmitted ? 0.7 : 1,
              }}
            >
              {feedbackSubmitted ? 'Submitted ✓' : 'Submit Feedback'}
            </button>

            {feedbackSubmitted && (
              <div
                style={{
                  marginTop: '12px',
                  fontSize: '13px',
                  color: '#1D9E75',
                  fontWeight: '600',
                }}
              >
                Thanks for the feedback!
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'faq' && (
        <div>
          <button onClick={() => setView('menu')} style={backButtonStyle}>
            ‹ Back
          </button>

          <div
            style={{
              background: '#FAEEDA',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '1rem',
              fontSize: '12px',
              color: '#854F0B',
              lineHeight: '1.6',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '4px' }}>
              A note on food allergies
            </strong>
            Tablemates meal suggestions and modifications are for planning
            convenience only and are not medical advice.
          </div>

          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#aaa',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '1rem',
            }}
          >
            help & faq
          </div>

          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginBottom: '0.5rem',
                cursor: 'pointer',
              }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    paddingRight: '12px',
                    lineHeight: '1.4',
                  }}
                >
                  {faq.q}
                </div>
                <span
                  style={{
                    fontSize: '18px',
                    color: '#1D9E75',
                    flexShrink: 0,
                    fontWeight: '300',
                  }}
                >
                  {openFaq === i ? '−' : '+'}
                </span>
              </div>

              {openFaq === i && (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#666',
                    marginTop: '10px',
                    lineHeight: '1.6',
                    borderTop: '0.5px solid #f0f0f0',
                    paddingTop: '10px',
                  }}
                >
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AccountSupport;