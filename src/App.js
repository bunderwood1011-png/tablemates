import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Splash from './Splash';
import OnboardingTour from './OnboardingTour';
import OnboardingScreen from './OnboardingScreen';
import AuthScreen from './AuthScreen';
import MainApp from './MainApp';

function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isBetaUser, setIsBetaUser] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Capture referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('tablemates_referral_code', ref.toUpperCase());
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        const { data: account } = await supabase
          .from('accounts')
          .select('beta_user')
          .eq('user_id', data.session.user.id)
          .single();

        if (account?.beta_user) {
          setIsBetaUser(true);
        }
      }

      if (mounted) {
        setSession(data.session);
        setLoadingSession(false);
      }
    };

    loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const seen = localStorage.getItem(`tablemates_onboarding_seen_${session.user.id}`) === 'true';
    setHasSeenOnboarding(seen);
  }, [session]);

  const handleFinishOnboarding = () => {
    localStorage.setItem(`tablemates_onboarding_seen_${session.user.id}`, 'true');
    setHasSeenOnboarding(true);
  };

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }

  if (loadingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f7f5',
          color: '#666',
          fontSize: '14px'
        }}
      >
        loading tablemates...
      </div>
    );
  }

  if (!session) {
    if (showAuth) return <AuthScreen />;
    return <OnboardingScreen onLogin={() => setShowAuth(true)} />;
  }

  if (!hasSeenOnboarding) {
    return <OnboardingTour onDone={handleFinishOnboarding} />;
  }

  return <MainApp user={session.user} isBetaUser={isBetaUser} />;
}

export default App;