/**
 * i18n.js — Motor de traducción para MetaRed Dashboard
 * Laboratorio de Gobierno · Universidad de la Sabana
 *
 * Las traducciones son inyectadas por Flask directamente en el HTML
 * como window.I18N_ALL (objeto con claves 'es', 'en', 'pt').
 * No hay fetch asíncrono — las traducciones están disponibles desde el inicio.
 *
 * API pública:
 *   window.i18n.setLang('es'|'en'|'pt')  — cambia el idioma, guarda cookie, re-renderiza
 *   window.i18n.t('key')                  — devuelve el string traducido
 *   window.i18n.getLang()                 — devuelve el idioma activo
 *   window.i18n.apply()                   — forza re-aplicación (para contenido dinámico)
 */
(function () {
    const SUPPORTED   = ['es', 'en', 'pt'];
    const STORAGE_KEY = 'metared_lang';

    // Idioma inicial: primero localStorage (cambiado por el switcher), luego cookie
    // (que viene de Flask), fallback 'es'.
    let currentLang = localStorage.getItem(STORAGE_KEY)
                   || (window.I18N_LANG || 'es');
    if (!SUPPORTED.includes(currentLang)) currentLang = 'es';

    // Traducciones disponibles inmediatamente (sin fetch)
    function getTranslations(lang) {
        return (window.I18N_ALL && window.I18N_ALL[lang]) || {};
    }

    // ── Aplica las traducciones al DOM ─────────────────────────────────────────
    function applyTranslations() {
        const tr = getTranslations(currentLang);

        // Textos: data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (tr[key] !== undefined) el.textContent = tr[key];
        });

        // Placeholders: data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (tr[key] !== undefined) el.placeholder = tr[key];
        });

        // Titles: data-i18n-title
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (tr[key] !== undefined) el.title = tr[key];
        });

        // Select options: data-i18n en <option>
        document.querySelectorAll('option[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (tr[key] !== undefined) el.textContent = tr[key];
        });

        // Actualizar <html lang>
        document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : currentLang;

        // Resaltar botón activo
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === currentLang);
        });

        // Notificar a otros módulos (charts.js, ai-assistant.js)
        document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang } }));
    }

    // ── Cambio de idioma ───────────────────────────────────────────────────────
    function setLang(lang) {
        if (!SUPPORTED.includes(lang)) return;
        currentLang = lang;
        // Guardar en localStorage (para que persista en SPA sin recargar)
        localStorage.setItem(STORAGE_KEY, lang);
        // Guardar cookie para que Flask también la lea en recargas
        document.cookie = `metared_lang=${lang};path=/;max-age=${60*60*24*365}`;
        applyTranslations();
    }

    function t(key) {
        const tr = getTranslations(currentLang);
        return tr[key] !== undefined ? tr[key] : key;
    }

    function getLang() { return currentLang; }

    window.i18n = { setLang, t, getLang, apply: applyTranslations };

    // ── Wiring de los botones del switcher ────────────────────────────────────
    function attachSwitcherEvents() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            // Remove existing listeners by cloning (prevents double binding on re-runs)
            const fresh = btn.cloneNode(true);
            btn.parentNode.replaceChild(fresh, btn);
            fresh.addEventListener('click', () => setLang(fresh.dataset.lang));
        });
    }

    // ── Aplicar al cargarse el DOM ─────────────────────────────────────────────
    // Las traducciones están disponibles de forma síncrona (window.I18N_ALL),
    // así que podemos aplicar en cuanto el DOM esté listo.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyTranslations();
            attachSwitcherEvents();
        });
    } else {
        // DOM ya cargado (script ejecutado tarde)
        applyTranslations();
        attachSwitcherEvents();
    }

    // Re-aplicar en window.load (después de que charts.js renderice contenido dinámico)
    window.addEventListener('load', () => {
        applyTranslations();
        attachSwitcherEvents();
        // Y de nuevo 800ms después por si fetch de datos API tarda
        setTimeout(() => { applyTranslations(); }, 800);
    });

})();
