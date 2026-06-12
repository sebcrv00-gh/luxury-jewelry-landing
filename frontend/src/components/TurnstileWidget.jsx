import { useEffect, useRef } from 'react';

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let turnstileScriptPromise = null;

function loadTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile solo puede cargarse en el navegador.'));
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.turnstile));
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export default function TurnstileWidget({
  siteKey,
  action,
  theme = 'dark',
  resetKey = 0,
  onTokenChange,
  onError
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined;

    let isCancelled = false;

    const mountWidget = async () => {
      try {
        const turnstile = await loadTurnstileScript();
        if (isCancelled || !containerRef.current || !turnstile?.render) return;

        containerRef.current.innerHTML = '';
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          callback: (token) => onTokenChange?.(token || ''),
          'expired-callback': () => onTokenChange?.(''),
          'timeout-callback': () => onTokenChange?.(''),
          'error-callback': () => {
            onTokenChange?.('');
            onError?.('No fue posible validar el captcha de seguridad. Intenta nuevamente.');
          }
        });
      } catch {
        onTokenChange?.('');
        onError?.('No fue posible cargar el captcha de seguridad. Revisa tu conexión e inténtalo de nuevo.');
      }
    };

    mountWidget();

    return () => {
      isCancelled = true;
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignora fallos al desmontar el widget.
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, action, theme, resetKey, onTokenChange, onError]);

  if (!siteKey) return null;

  return <div className="turnstile-widget-shell" ref={containerRef} />;
}
