import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Splash from './Splash';
import OnboardingScreen from './OnboardingScreen';
import AuthScreen from './AuthScreen';
import MainApp from './MainApp';

function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isBetaUser, setIsBetaUser] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(
    localStorage.getItem('tablemates_onboarding_seen') === 'true'
  );

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
  const { data } = await supabase.auth.getSession();

  console.log('session:', data.session);

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

  const handleFinishOnboarding = () => {
    localStorage.setItem('tablemates_onboarding_seen', 'true');
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

  if (!session && !hasSeenOnboarding) {
    return <OnboardingScreen onContinue={handleFinishOnboarding} />;
  }

  if (!session) {
    return <AuthScreen />;
  }

 return <MainApp user={session.user} isBetaUser={isBetaUser} />;
}

export default App;