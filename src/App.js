import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import AuthScreen from './AuthScreen';
import MainApp from './MainApp';

function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

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
    return <AuthScreen />;
  }

  return <MainApp user={session.user} />;
}

export default App;