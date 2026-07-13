/**
 * Vereinsverwaltung – Adminbereich
 */

import {
  apiGet,
  apiPost
} from './api.js';

import {
  getStoredToken,
  login,
  validateSession,
  refreshSession,
  logout
} from './auth.js';

const adminState = {
  authenticated: false,
  session: null,
  events: [],
  lists: [],
  categories: [],
  loading: false,
  refreshTimer: null
};

/**
 * Rendert den Adminbereich.
 *
 * @param {Object} options
 */
export async function renderAdminPage(options) {
  const {
    contentElement,
    setPageHeading,
    categories = []
  } = options;

  setPageHeading(
    'Administration',
    'Veranstaltungen, Einsätze und Kategorien verwalten'
  );

  adminState.categories =
    Array.isArray(categories)
      ? categories
      : [];

  contentElement.innerHTML =
    createAdminLoadingMarkup();

  const session =
    await validateSession();

  if (!session) {
    stopSessionRefresh();
    renderLogin(
      contentElement,
      options
    );
    return;
  }

  adminState.authenticated =
    true;

  adminState.session =
    session;

  startSessionRefresh();

  await renderAdminDashboard(
    contentElement,
    options
  );
}

function renderLogin(
  contentElement,
  options
) {
  adminState.authenticated =
    false;

  contentElement.innerHTML = `
    <section class="admin-login-shell">
      <article class="admin-login-card">
        <div class="admin-login-icon" aria-hidden="true">⚙</div>

        <span class="eyebrow">
          Geschützter Bereich
        </span>

        <h2>Administration öffnen</h2>

        <p>
          Verwende das gemeinsame Adminpasswort der Einrichtung.
        </p>

        <form id="adminLoginForm" class="admin-login-form">
          <label class="form-field">
            <span>Adminpasswort</span>
            <input
              name="password"
              type="password"
              minlength="8"
              required
              autocomplete="current-password"
              placeholder="Passwort eingeben"
            >
          </label>

          <div
            id="adminLoginError"
            class="form-error"
            hidden
          ></div>

          <button
            type="submit"
            class="button button-primary"
          >
            Anmelden
          </button>
        </form>
      </article>
    </section>
  `;

  const form =
    contentElement.querySelector(
      '#adminLoginForm'
    );

  form.elements.password.focus();

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const submitButton =
        form.querySelector(
          '[type="submit"]'
        );

      const errorBox =
        form.querySelector(
          '#adminLoginError'
        );

      submitButton.disabled =
        true;

      submitButton.textContent =
        'Anmeldung läuft …';

      errorBox.hidden =
        true;

      try {
        const result =
          await login(
            form.elements.password.value
          );

        adminState.authenticated =
          true;

        adminState.session =
          result;

        startSessionRefresh();

        await renderAdminDashboard(
          contentElement,
          options
        );
      } catch (error) {
        errorBox.textContent =
          error && error.message
            ? error.message
            : 'Die Anmeldung ist fehlgeschlagen.';

        errorBox.hidden =
          false;

        submitButton.disabled =
          false;

        submitButton.textContent =
          'Anmelden';
      }
    }
  );
}

async function renderAdminDashboard(
  contentElement,
  options
) {
  contentElement.innerHTML =
    createAdminLoadingMarkup();

  try {
    const [
      events,
      lists,
      categories
    ] = await Promise.all([
      apiGet('events'),
      apiGet('lists'),
      apiGet('categories')
    ]);

    adminState.events =
      Array.isArray(events)
        ? events
        : [];

    adminState.lists =
      Array.isArray(lists)
        ? lists
        : [];

    adminState.categories =
      Array.isArray(categories)
        ? categories
        : [];

    contentElement.innerHTML = `
      <section class="admin-header-card">
        <div>
          <span class="eyebrow">
            Adminbereich
          </span>

          <h2>
            ${escapeHtml(
              adminState.session &&
              adminState.session.einrichtungsname
                ? adminState.session.einrichtungsname
                : 'Einrichtung'
            )}
          </h2>

          <p>
            Veranstaltungen und Einsätze direkt verwalten.
          </p>
        </div>

        <button
          type="button"
          class="button button-secondary"
          id="adminLogoutButton"
        >
          Abmelden
        </button>
      </section>

      <section class="admin-metric-grid">
        ${adminMetric(
          'Veranstaltungen',
          adminState.events.length
        )}
        ${adminMetric(
          'Listen und Einsätze',
          adminState.lists.length
        )}
        ${adminMetric(
          'Kategorien',
          adminState.categories.length
        )}
      </section>

      <section class="admin-action-grid">
        <button
          type="button"
          class="admin-action-card"
          id="createEventButton"
        >
          <span class="admin-action-icon">＋</span>
          <strong>Veranstaltung anlegen</strong>
          <span>
            Termin, Titel und Status erfassen
          </span>
        </button>

        <button
          type="button"
          class="admin-action-card"
          id="createListButton"
          ${adminState.events.length
            ? ''
            : 'disabled'}
        >
          <span class="admin-action-icon">≡</span>
          <strong>Einsatz oder Liste anlegen</strong>
          <span>
            Aufgabe einer Veranstaltung zuordnen
          </span>
        </button>
      </section>

      <section class="admin-content-grid">
        <article class="panel-card">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">
                Veranstaltungen
              </span>
              <h3>Aktueller Bestand</h3>
            </div>
          </div>

          <div class="admin-record-list">
            ${adminState.events.length
              ? adminState.events
                  .map(event =>
                    renderAdminEvent(event)
                  )
                  .join('')
              : `
                <div class="admin-empty-note">
                  Noch keine Veranstaltung vorhanden.
                </div>
              `}
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">
                Einsätze und Listen
              </span>
              <h3>Aktueller Bestand</h3>
            </div>
          </div>

          <div class="admin-record-list">
            ${adminState.lists.length
              ? adminState.lists
                  .map(list =>
                    renderAdminList(list)
                  )
                  .join('')
              : `
                <div class="admin-empty-note">
                  Noch keine Liste oder kein Einsatz vorhanden.
                </div>
              `}
          </div>
        </article>
      </section>

      <div id="adminDialogRoot"></div>
      <div id="adminToastRoot" class="toast-root"></div>
    `;

    bindAdminDashboard(
      contentElement,
      options
    );
  } catch (error) {
    contentElement.innerHTML = `
      <section class="error-card" role="alert">
        <span class="eyebrow">Administration</span>
        <h2>Die Verwaltungsdaten konnten nicht geladen werden</h2>
        <p>${escapeHtml(
          error && error.message
            ? error.message
            : 'Unbekannter Fehler'
        )}</p>
        <button
          type="button"
          class="button button-primary"
          id="adminRetryButton"
        >
          Erneut versuchen
        </button>
      </section>
    `;

    contentElement
      .querySelector(
        '#adminRetryButton'
      )
      .addEventListener(
        'click',
        () => renderAdminDashboard(
          contentElement,
          options
        )
      );
  }
}

function bindAdminDashboard(
  contentElement,
  options
) {
  contentElement
    .querySelector(
      '#adminLogoutButton'
    )
    .addEventListener(
      'click',
      async () => {
        stopSessionRefresh();
        await logout();
        renderLogin(
          contentElement,
          options
        );
      }
    );

  contentElement
    .querySelector(
      '#createEventButton'
    )
    .addEventListener(
      'click',
      () => openEventDialog(
        contentElement,
        options
      )
    );

  const listButton =
    contentElement.querySelector(
      '#createListButton'
    );

  if (!listButton.disabled) {
    listButton.addEventListener(
      'click',
      () => openListDialog(
        contentElement,
        options
      )
    );
  }
}

function openEventDialog(
  contentElement,
  options
) {
  const root =
    contentElement.querySelector(
      '#adminDialogRoot'
    );

  root.innerHTML = `
    <div class="dialog-backdrop">
      <section
        class="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adminEventDialogTitle"
      >
        <header class="dialog-header">
          <div>
            <span class="eyebrow">
              Neue Veranstaltung
            </span>
            <h2 id="adminEventDialogTitle">
              Veranstaltung anlegen
            </h2>
          </div>

          <button
            type="button"
            class="icon-button"
            data-admin-dialog-close
            aria-label="Dialog schließen"
          >
            ×
          </button>
        </header>

        <form
          id="adminEventForm"
          class="dialog-form"
        >
          <label class="form-field">
            <span>Titel</span>
            <input
              name="titel"
              type="text"
              maxlength="160"
              required
            >
          </label>

          <label class="form-field">
            <span>Beschreibung <small>optional</small></span>
            <textarea
              name="beschreibung"
              rows="3"
              maxlength="1000"
            ></textarea>
          </label>

          <div class="form-grid-two">
            <label class="form-field">
              <span>Startdatum</span>
              <input
                name="startdatum"
                type="date"
                required
              >
            </label>

            <label class="form-field">
              <span>Enddatum <small>optional</small></span>
              <input
                name="enddatum"
                type="date"
              >
            </label>
          </div>

          <div class="form-grid-two">
            <label class="form-field">
              <span>Status</span>
              <select name="status">
                <option value="offen">Offen</option>
                <option value="geschlossen">Geschlossen</option>
              </select>
            </label>

            <label class="form-field">
              <span>Sortierung</span>
              <input
                name="sortierung"
                type="number"
                step="1"
                value="0"
              >
            </label>
          </div>

          <div
            id="adminEventError"
            class="form-error"
            hidden
          ></div>

          <div class="dialog-actions">
            <button
              type="button"
              class="button button-secondary"
              data-admin-dialog-close
            >
              Abbrechen
            </button>

            <button
              type="submit"
              class="button button-primary"
            >
              Veranstaltung speichern
            </button>
          </div>
        </form>
      </section>
    </div>
  `;

  bindDialogClose(root);

  const form =
    root.querySelector(
      '#adminEventForm'
    );

  form.elements.titel.focus();

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const button =
        form.querySelector(
          '[type="submit"]'
        );

      const errorBox =
        form.querySelector(
          '#adminEventError'
        );

      button.disabled =
        true;

      button.textContent =
        'Wird gespeichert …';

      errorBox.hidden =
        true;

      try {
        await apiPost(
          'createevent',
          {
            data: {
              titel:
                form.elements.titel.value.trim(),
              beschreibung:
                form.elements.beschreibung.value.trim(),
              startdatum:
                toGermanDate(
                  form.elements.startdatum.value
                ),
              enddatum:
                form.elements.enddatum.value
                  ? toGermanDate(
                      form.elements.enddatum.value
                    )
                  : '',
              status:
                form.elements.status.value,
              sortierung:
                Number(
                  form.elements.sortierung.value || 0
                )
            }
          },
          getStoredToken()
        );

        closeAdminDialog(root);

        showAdminToast(
          contentElement,
          'Veranstaltung erfolgreich angelegt.'
        );

        await renderAdminDashboard(
          contentElement,
          options
        );
      } catch (error) {
        errorBox.textContent =
          error && error.message
            ? error.message
            : 'Die Veranstaltung konnte nicht gespeichert werden.';

        errorBox.hidden =
          false;

        button.disabled =
          false;

        button.textContent =
          'Veranstaltung speichern';
      }
    }
  );
}

function openListDialog(
  contentElement,
  options
) {
  const root =
    contentElement.querySelector(
      '#adminDialogRoot'
    );

  root.innerHTML = `
    <div class="dialog-backdrop">
      <section
        class="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adminListDialogTitle"
      >
        <header class="dialog-header">
          <div>
            <span class="eyebrow">
              Neuer Einsatz
            </span>
            <h2 id="adminListDialogTitle">
              Einsatz oder Liste anlegen
            </h2>
          </div>

          <button
            type="button"
            class="icon-button"
            data-admin-dialog-close
            aria-label="Dialog schließen"
          >
            ×
          </button>
        </header>

        <form
          id="adminListForm"
          class="dialog-form"
        >
          <label class="form-field">
            <span>Veranstaltung</span>
            <select
              name="veranstaltungId"
              required
            >
              ${adminState.events
                .map(event => `
                  <option value="${escapeHtml(event.id)}">
                    ${escapeHtml(event.titel)}
                  </option>
                `)
                .join('')}
            </select>
          </label>

          <div class="form-grid-two">
            <label class="form-field">
              <span>Typ</span>
              <select name="typ">
                <option value="Helfereinsatz">
                  Helfereinsatz
                </option>
                <option value="Schicht">
                  Schicht
                </option>
                <option value="Beitragsliste">
                  Beitragsliste
                </option>
                <option value="Kuchenliste">
                  Kuchenliste
                </option>
              </select>
            </label>

            <label class="form-field">
              <span>Kategorie</span>
              <select name="kategorie">
                ${adminState.categories
                  .map(category => `
                    <option value="${escapeHtml(category.bezeichnung)}">
                      ${escapeHtml(category.bezeichnung)}
                    </option>
                  `)
                  .join('')}
              </select>
            </label>
          </div>

          <label class="form-field">
            <span>Titel</span>
            <input
              name="titel"
              type="text"
              maxlength="160"
              required
            >
          </label>

          <label class="form-field">
            <span>Beschreibung <small>optional</small></span>
            <textarea
              name="beschreibung"
              rows="3"
              maxlength="1000"
            ></textarea>
          </label>

          <div class="form-grid-two">
            <label class="form-field">
              <span>Datum</span>
              <input
                name="datum"
                type="date"
              >
            </label>

            <label class="form-field">
              <span>Uhrzeit</span>
              <input
                name="uhrzeit"
                type="text"
                maxlength="80"
                placeholder="Zum Beispiel 09:00 – 12:00"
              >
            </label>
          </div>

          <div class="form-grid-three">
            <label class="form-field">
              <span>Plätze</span>
              <input
                name="anzahl"
                type="number"
                min="0"
                step="1"
                value="1"
              >
            </label>

            <label class="form-field">
              <span>Punkte</span>
              <input
                name="punkte"
                type="number"
                min="0"
                step="0.5"
                value="0"
              >
            </label>

            <label class="form-field">
              <span>Sortierung</span>
              <input
                name="sortierung"
                type="number"
                step="1"
                value="0"
              >
            </label>
          </div>

          <label class="form-field">
            <span>Status</span>
            <select name="status">
              <option value="offen">Offen</option>
              <option value="geschlossen">Geschlossen</option>
            </select>
          </label>

          <div
            id="adminListError"
            class="form-error"
            hidden
          ></div>

          <div class="dialog-actions">
            <button
              type="button"
              class="button button-secondary"
              data-admin-dialog-close
            >
              Abbrechen
            </button>

            <button
              type="submit"
              class="button button-primary"
            >
              Einsatz speichern
            </button>
          </div>
        </form>
      </section>
    </div>
  `;

  bindDialogClose(root);

  const form =
    root.querySelector(
      '#adminListForm'
    );

  form.elements.titel.focus();

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      const button =
        form.querySelector(
          '[type="submit"]'
        );

      const errorBox =
        form.querySelector(
          '#adminListError'
        );

      button.disabled =
        true;

      button.textContent =
        'Wird gespeichert …';

      errorBox.hidden =
        true;

      try {
        await apiPost(
          'createlist',
          {
            data: {
              veranstaltungId:
                form.elements.veranstaltungId.value,
              typ:
                form.elements.typ.value,
              titel:
                form.elements.titel.value.trim(),
              beschreibung:
                form.elements.beschreibung.value.trim(),
              datum:
                form.elements.datum.value
                  ? toGermanDate(
                      form.elements.datum.value
                    )
                  : '',
              uhrzeit:
                form.elements.uhrzeit.value.trim(),
              kategorie:
                form.elements.kategorie.value,
              anzahl:
                Number(
                  form.elements.anzahl.value || 0
                ),
              punkte:
                Number(
                  form.elements.punkte.value || 0
                ),
              status:
                form.elements.status.value,
              sortierung:
                Number(
                  form.elements.sortierung.value || 0
                )
            }
          },
          getStoredToken()
        );

        closeAdminDialog(root);

        showAdminToast(
          contentElement,
          'Einsatz erfolgreich angelegt.'
        );

        await renderAdminDashboard(
          contentElement,
          options
        );
      } catch (error) {
        errorBox.textContent =
          error && error.message
            ? error.message
            : 'Der Einsatz konnte nicht gespeichert werden.';

        errorBox.hidden =
          false;

        button.disabled =
          false;

        button.textContent =
          'Einsatz speichern';
      }
    }
  );
}

function renderAdminEvent(event) {
  return `
    <div class="admin-record">
      <div>
        <strong>${escapeHtml(event.titel)}</strong>
        <span>
          ${escapeHtml(
            event.startdatum ||
            'Ohne Datum'
          )}
        </span>
      </div>

      <span class="status-badge ${
        String(event.status).toLowerCase() ===
          'offen'
          ? 'is-open'
          : 'is-closed'
      }">
        ${escapeHtml(event.status)}
      </span>
    </div>
  `;
}

function renderAdminList(list) {
  const event =
    adminState.events.find(item =>
      item.id ===
      list.veranstaltungId
    );

  return `
    <div class="admin-record">
      <div>
        <strong>${escapeHtml(list.titel)}</strong>
        <span>
          ${escapeHtml(
            event
              ? event.titel
              : 'Ohne Veranstaltung'
          )}
          ·
          ${escapeHtml(
            list.kategorie ||
            'Ohne Kategorie'
          )}
        </span>
      </div>

      <span class="status-badge ${
        String(list.status).toLowerCase() ===
          'offen'
          ? 'is-open'
          : 'is-closed'
      }">
        ${escapeHtml(list.status)}
      </span>
    </div>
  `;
}

function bindDialogClose(root) {
  root
    .querySelectorAll(
      '[data-admin-dialog-close]'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => closeAdminDialog(root)
      );
    });

  const backdrop =
    root.querySelector(
      '.dialog-backdrop'
    );

  backdrop.addEventListener(
    'click',
    event => {
      if (
        event.target ===
        backdrop
      ) {
        closeAdminDialog(root);
      }
    }
  );
}

function closeAdminDialog(root) {
  root.innerHTML = '';
}

function adminMetric(
  label,
  value
) {
  return `
    <article class="admin-metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function showAdminToast(
  contentElement,
  message
) {
  const root =
    contentElement.querySelector(
      '#adminToastRoot'
    );

  if (!root) {
    return;
  }

  const toast =
    document.createElement('div');

  toast.className =
    'toast toast-success';

  toast.textContent =
    message;

  root.appendChild(toast);

  window.setTimeout(
    () => toast.remove(),
    3500
  );
}

function startSessionRefresh() {
  stopSessionRefresh();

  adminState.refreshTimer =
    window.setInterval(
      async () => {
        try {
          await refreshSession();
        } catch (error) {
          stopSessionRefresh();
        }
      },
      10 * 60 * 1000
    );
}

function stopSessionRefresh() {
  if (
    adminState.refreshTimer
  ) {
    window.clearInterval(
      adminState.refreshTimer
    );

    adminState.refreshTimer =
      null;
  }
}

function createAdminLoadingMarkup() {
  return `
    <section class="events-loading">
      <div class="panel-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton"></div>
        <div class="skeleton skeleton-short"></div>
      </div>
    </section>
  `;
}

function toGermanDate(value) {
  const text =
    String(value || '').trim();

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      text
    );

  if (!match) {
    return text;
  }

  return (
    match[3] +
    '.' +
    match[2] +
    '.' +
    match[1]
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
