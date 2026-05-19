import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Diamond } from 'lucide-react';

export default function WelcomeAnimation() {
  const { showWelcome, welcomeName, closeWelcome } = useAuth();
  const [render, setRender] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (showWelcome) {
      document.body.style.overflow = 'hidden';
      setRender(true);
      // Small delay to ensure display:block is rendered before opacity change
      const fadeTimer = setTimeout(() => setFade(true), 50);
      
      const hideTimer = setTimeout(() => {
        setFade(false);
        setTimeout(() => {
          setRender(false);
          closeWelcome();
          document.body.style.overflow = '';
        }, 1200); // Wait for fade out
      }, 3000); // Show for 3 seconds

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
        document.body.style.overflow = '';
      };
    }
  }, [showWelcome, closeWelcome]);

  if (!render) return null;

  return (
    <div className={`welcome-animation-overlay ${fade ? 'active' : ''}`}>
      <div className="welcome-animation-bg"></div>
      <div className="welcome-animation-content">
        <div className="welcome-logo-wrapper">
          <Diamond size={50} className="welcome-icon" />
          <div className="welcome-glow"></div>
        </div>
        <h2 className="welcome-title">Bienvenido a la elegancia</h2>
        <p className="welcome-name">{welcomeName || 'Usuario'}</p>
        <div className="welcome-line"></div>
      </div>
    </div>
  );
}
