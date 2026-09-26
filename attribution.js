(function () {
  'use strict';

  const storageKey = 'assembly_attribution_v1';
  const campaignKeys = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'yclid',
    'gclid',
    'fbclid',
    'vk_click_id'
  ];

  function clean(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 240);
  }

  function safeReferrerOrigin() {
    if (!document.referrer) return '';
    try {
      const referrer = new URL(document.referrer);
      return /^https?:$/.test(referrer.protocol) ? referrer.origin : '';
    } catch (_) {
      return '';
    }
  }

  function readStored() {
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      return value && typeof value === 'object' ? value : {};
    } catch (_) {
      return {};
    }
  }

  const params = new URLSearchParams(window.location.search);
  const current = {};
  campaignKeys.forEach((key) => {
    if (params.has(key)) current[key] = clean(params.get(key));
  });

  const hasCampaign = Object.values(current).some(Boolean);
  const attribution = hasCampaign
    ? {
        ...current,
        attribution_landing_path: clean(window.location.pathname),
        attribution_referrer_origin: safeReferrerOrigin(),
        attribution_captured_at: new Date().toISOString()
      }
    : readStored();

  if (hasCampaign) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(attribution));
    } catch (_) {
      // Attribution still remains available for the current page if storage is unavailable.
    }
  }

  window.AssemblyAttribution = Object.freeze({ ...attribution });

  function applyToForm() {
    document.querySelectorAll('[data-attribution]').forEach((field) => {
      field.value = clean(attribution[field.name]);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyToForm, { once: true });
  } else {
    applyToForm();
  }
})();
