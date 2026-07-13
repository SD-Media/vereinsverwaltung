/**
 * Vereinsverwaltung – Laufzeitkonfiguration
 *
 * Der Mandant wird vorrangig aus ?tenant=... gelesen.
 * Ohne URL-Parameter wird vorübergehend „waldkindergarten“ verwendet.
 */

export const APP_CONFIG = Object.freeze({
  appName: 'Vereinsplattform',
  version: '2.0.0-alpha.1',
  apiUrl:
    'https://script.google.com/macros/s/AKfycbxe59aQThQZtSQnptrMOSRUYtcV4VC43dWXvns2EuBwa4xaYIZt817wLO4Lt8c5L_BxRA/exec',
  defaultTenant: 'waldkindergarten',
  requestTimeoutMs: 20000
});

export function resolveTenant() {
  const params = new URLSearchParams(window.location.search);
  const tenant = String(
    params.get('tenant') || APP_CONFIG.defaultTenant
  )
    .trim()
    .toLowerCase();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tenant)) {
    throw new Error(
      'Die Einrichtungskennung in der URL ist ungültig.'
    );
  }

  return tenant;
}
