/**
 * Übergangsmodus der früheren Vereinsplattform.
 *
 * Alle Inhalte und Anmeldungen bleiben erreichbar. Schreibende Bedienelemente
 * werden entfernt und zusätzlich zentral im API-Client gesperrt.
 */

import { getTenant } from './api.js';

const NEW_SITE_ORIGIN = 'https://www.einsatzplaner-vereine.de';

const MUTATION_SELECTORS = [
  '#createEventButton',
  '#adminCategoryManagementButton',
  '#adminPointsConfigButton',
  '#adminTenantSettingsButton',
  '#createMessageButton',
  '#createTenantButton',
  '#supportFeedbackForm',
  '[data-public-entry-list-id]',
  '[data-admin-edit-event]',
  '[data-admin-archive-event]',
  '[data-admin-copy-event]',
  '[data-admin-delete-event]',
  '[data-admin-create-list]',
  '[data-admin-edit-list]',
  '[data-admin-copy-list]',
  '[data-admin-delete-list]',
  '[data-admin-delete-entry]',
  '[data-archive-restore]',
  '[data-edit-tenant]',
  '[data-delete-tenant]',
  '[data-delete-message]',
  '#createTenantForm',
  '#editTenantForm',
  '#deleteTenantForm',
  '#createMessageForm',
  '#tenantPeriodForm',
  '#tenantPasswordForm',
  '#categoryManagementForm',
  '#pointsConfigForm',
  '#adminEventForm',
  '#adminListForm',
  '#publicEntryForm'
].join(',');

export function initializeReadOnlyMode() {
  document.body.classList.add('is-read-only');
  updateMigrationLink_();
  suppressMutationControls_();

  const observer = new MutationObserver(suppressMutationControls_);
  observer.observe(document.body, { childList: true, subtree: true });
}

function updateMigrationLink_() {
  const link = document.getElementById('migrationBannerLink');
  if (!link) return;

  const tenant = getTenant();
  link.href = tenant
    ? `${NEW_SITE_ORIGIN}/${encodeURIComponent(tenant)}/`
    : `${NEW_SITE_ORIGIN}/`;
}

function suppressMutationControls_() {
  document.querySelectorAll(MUTATION_SELECTORS).forEach(element => {
    element.setAttribute('hidden', '');
    element.setAttribute('aria-hidden', 'true');
  });
}
