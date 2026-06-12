import { useEffect, useRef } from 'react';

const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let turnstileScriptPromise = null;
let turnstileReadyPromise = null;

function waitForTurnstileReady(timeoutMs = 8000) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile solo puede cargarse en el navegador.'));
  }

  if (window.turnstile?.render) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileReadyPromise) {
    return turnstileReadyPromise;
  }

  turnstileReadyPromise = new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const checkReady = () => {
      if (window.turnstile?.render) {
        turnstileReadyPromise = null;
        resolve(window.turnstile);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        turnstileReadyPromise = null;
        reject(new Error('Turnstile no terminó de inicializar.'));
        return;
      }

      window.setTimeout(checkReady, 120);
    };

    checkReady();
  });

  return turnstileReadyPromise;
}

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
      if (window.turnstile?.render) {
        resolve(window.turnstile);
        return;
      }

      existingScript.addEventListener('load', async () => {
        try {
          const turnstile = await waitForTurnstileReady();
          resolve(turnstile);
        } catch (error) {
          reject(error);
        }
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = async () => {
      try {
        const turnstile = await waitForTurnstileReady();
        resolve(turnstile);
      } catch (error) {
        reject(error);
      }
    };
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
        // #region debug-point A:widget-mount-start
        fetch('http://127.0.0.1:7777/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'turnstile-missing',
            runId: 'pre-fix',
            hypothesisId: 'A',
            location: 'frontend/components/TurnstileWidget.jsx:mountWidget:start',
            msg: '[DEBUG] Turnstile mount requested',
            data: {
              action,
              theme,
              siteKeyPresent: Boolean(siteKey),
              siteKeyLength: String(siteKey || '').length
            },
            ts: Date.now()
          })
        }).catch(() => {});
        // #endregion
        const turnstile = await loadTurnstileScript();
        if (isCancelled || !containerRef.current || !turnstile?.render) {
          throw new Error('Turnstile no está listo para renderizar.');
        }

        containerRef.current.innerHTML = '';
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          callback: (token) => {
            // #region debug-point C:widget-token
            fetch('http://127.0.0.1:7777/event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'turnstile-missing',
                runId: 'pre-fix',
                hypothesisId: 'C',
                location: 'frontend/components/TurnstileWidget.jsx:callback',
                msg: '[DEBUG] Turnstile token callback received',
                data: {
                  action,
                  tokenPresent: Boolean(token),
                  tokenLength: String(token || '').length
                },
                ts: Date.now()
              })
            }).catch(() => {});
            // #endregion
            onTokenChange?.(token || '');
          },
          'expired-callback': () => onTokenChange?.(''),
          'timeout-callback': () => onTokenChange?.(''),
          'error-callback': () => {
            // #region debug-point C:widget-error-callback
            fetch('http://127.0.0.1:7777/event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'turnstile-missing',
                runId: 'pre-fix',
                hypothesisId: 'C',
                location: 'frontend/components/TurnstileWidget.jsx:error-callback',
                msg: '[DEBUG] Turnstile error callback fired',
                data: { action, theme },
                ts: Date.now()
              })
            }).catch(() => {});
            // #endregion
            onTokenChange?.('');
            onError?.('No fue posible validar el captcha de seguridad. Intenta nuevamente.');
          }
        });
        // #region debug-point A:widget-render-success
        fetch('http://127.0.0.1:7777/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'turnstile-missing',
            runId: 'pre-fix',
            hypothesisId: 'A',
            location: 'frontend/components/TurnstileWidget.jsx:mountWidget:rendered',
            msg: '[DEBUG] Turnstile render call completed',
            data: {
              action,
              theme,
              widgetIdPresent: widgetIdRef.current !== null && widgetIdRef.current !== undefined,
              containerChildCount: containerRef.current.childElementCount
            },
            ts: Date.now()
          })
        }).catch(() => {});
        // #endregion
      } catch {
        // #region debug-point C:widget-mount-error
        fetch('http://127.0.0.1:7777/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'turnstile-missing',
            runId: 'pre-fix',
            hypothesisId: 'C',
            location: 'frontend/components/TurnstileWidget.jsx:mountWidget:catch',
            msg: '[DEBUG] Turnstile mount failed',
            data: {
              action,
              theme,
              siteKeyPresent: Boolean(siteKey),
              siteKeyLength: String(siteKey || '').length
            },
            ts: Date.now()
          })
        }).catch(() => {});
        // #endregion
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
