'use client';

/**
 * Puente Capacitor: detecta si la web está corriendo dentro de la app nativa
 * y activa plugins (status bar, splash, keyboard, back button, etc).
 *
 * En navegador web: no hace absolutamente nada (fallbacks silenciosos).
 */

let initialized = false;

export async function initCapacitor(router) {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Importar Capacitor dinámicamente para que no rompa en SSR/web
  let Capacitor;
  try {
    const mod = await import('@capacitor/core');
    Capacitor = mod.Capacitor;
  } catch {
    return; // Capacitor no instalado (entorno de pruebas sin deps)
  }

  if (!Capacitor.isNativePlatform()) return;

  // 1. Splash screen — ocultar cuando la app ya cargó
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {}

  // 2. Status bar
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#1c1b18' });
    }
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {}

  // 3. Keyboard – evitar que tape los inputs
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--kb-height', `${info.keyboardHeight}px`);
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--kb-height', '0px');
    });
  } catch {}

  // 4. Botón atrás Android – integrar con el router
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {}

  // 5. Deep links (por si se usan en el futuro: academiaagora://...)
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appUrlOpen', (event) => {
      if (!event.url || !router) return;
      try {
        const url = new URL(event.url);
        router.push(url.pathname + url.search);
      } catch {}
    });
  } catch {}
}

/**
 * Abre una URL externa en el navegador del sistema (en vez del WebView).
 * Útil para Stripe Checkout y enlaces de Zoom, que no funcionan bien
 * dentro del WebView por políticas de seguridad.
 */
export async function openExternalUrl(url) {
  if (typeof window === 'undefined') return;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' });
      return;
    }
  } catch {}
  // Fallback web
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Ejecutar haptic feedback suave (feedback táctil).
 * No-op en web.
 */
export async function haptic(style = 'light') {
  if (typeof window === 'undefined') return;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] || ImpactStyle.Light });
  } catch {}
}

/**
 * Detecta si estamos dentro de la app nativa.
 * Útil para ocultar banners de instalación o ajustar UI.
 */
export function isNative() {
  if (typeof window === 'undefined') return false;
  // Capacitor inyecta window.Capacitor.isNativePlatform
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}
