/**
 * Vereinsverwaltung – persönlicher Punktebereich
 *
 * Keine Personenverwaltung:
 * Die Suche erfolgt ausschließlich über die gleiche Namensschreibweise,
 * die bei den öffentlichen Eintragungen verwendet wurde.
 */

import {
  getStoreSnapshot
} from './store.js';

export function renderPointsPage(
  options
) {
  const {
    contentElement,
    setPageHeading
  } = options;

  setPageHeading(
    'Punkte',
    'Persönlichen Soll-Ist-Stand prüfen'
  );

  const data =
    getStoreSnapshot()
      .frontendData;

  const points =
    data &&
    data.punkte
      ? data.punkte
      : null;

  if (
    !points ||
    !points.konfiguration ||
    points.konfiguration.punkteAktiv !==
      true
  ) {
    contentElement.innerHTML = `
      <section class="empty-state">
        <div class="empty-icon">◉</div>
        <h2>Punktesystem nicht aktiviert</h2>
        <p>
          Für diese Einrichtung ist derzeit kein Punktesystem aktiv.
        </p>
      </section>
    `;

    return;
  }

  const label =
    points.konfiguration
      .punkteBezeichnung ||
    'Punkte';

  contentElement.innerHTML = `
    <section class="info-banner">
      <span class="info-banner-icon">i</span>

      <div>
        <strong>
          Bitte immer dieselbe Namensschreibweise verwenden.
        </strong>

        <span>
          Es gibt kein Benutzerkonto und keine Personenverwaltung.
          Die Auswertung erfolgt nur über den eingegebenen Namen.
        </span>
      </div>
    </section>

    <section class="points-search-card panel-card">
      <div>
        <span class="eyebrow">
          Persönliche Übersicht
        </span>

        <h2>Eigenen Punktestand prüfen</h2>

        <p>
          Gib den Namen genau so ein, wie er bei deinen Eintragungen
          verwendet wurde.
        </p>
      </div>

      <form id="pointsSearchForm">
        <label class="form-field">
          <span>Name</span>

          <input
            name="name"
            type="text"
            maxlength="120"
            required
            autocomplete="name"
            placeholder="Zum Beispiel Müller oder Müller A."
          >
        </label>

        <button
          type="submit"
          class="button button-primary"
        >
          Punktestand anzeigen
        </button>
      </form>
    </section>

    <section id="personalPointsResult"></section>
  `;

  const form =
    contentElement.querySelector(
      '#pointsSearchForm'
    );

  form.addEventListener(
    'submit',
    event => {
      event.preventDefault();

      const name =
        form.elements.name.value
          .trim();

      renderPersonalResult(
        contentElement,
        points,
        name,
        label
      );
    }
  );
}

function renderPersonalResult(
  contentElement,
  points,
  searchedName,
  label
) {
  const target =
    contentElement.querySelector(
      '#personalPointsResult'
    );

  const normalizedName =
    normalizePersonName(
      searchedName
    );

  const person =
    (
      points.personen || []
    ).find(item =>
      normalizePersonName(
        item.name
      ) ===
      normalizedName
    );

  const targetValue =
    Number(
      points.konfiguration
        .sollwertAktiv
        ? points.konfiguration
            .sollwert
        : 0
    );

  const result =
    person || {
      name:
        searchedName,
      punkte:
        0,
      rest:
        targetValue,
      sollwert:
        targetValue,
      sollwertErreicht:
        false,
      anzahlEintragungen:
        0,
      details:
        []
    };

  const percentage =
    targetValue > 0
      ? Math.min(
          100,
          Math.round(
            Number(result.punkte || 0) /
            targetValue *
            100
          )
        )
      : 0;

  target.innerHTML = `
    <section class="personal-points-card">
      <header>
        <div>
          <span class="eyebrow">
            ${escapeHtml(result.name)}
          </span>

          <h2>
            ${result.sollwertErreicht
              ? 'Soll erreicht'
              : 'Aktueller Punktestand'}
          </h2>
        </div>

        <span class="points-status ${
          result.sollwertErreicht
            ? 'is-reached'
            : 'is-open'
        }">
          ${result.sollwertErreicht
            ? 'Erfüllt'
            : 'Offen'}
        </span>
      </header>

      <div class="points-metric-grid">
        ${metric(
          'Soll',
          targetValue,
          label
        )}

        ${metric(
          'Ist',
          result.punkte,
          label
        )}

        ${metric(
          'Fehlen',
          result.rest,
          label
        )}

        ${metric(
          'Eintragungen',
          result.anzahlEintragungen,
          ''
        )}
      </div>

      ${targetValue > 0
        ? `
          <div class="points-progress">
            <div>
              <span>Fortschritt</span>
              <strong>${percentage} %</strong>
            </div>

            <div class="progress-track">
              <span style="width:${percentage}%"></span>
            </div>
          </div>
        `
        : ''}

      <div class="points-detail-list">
        <h3>Berücksichtigte Einsätze und Listen</h3>

        ${result.details &&
          result.details.length
          ? result.details
              .map(detail => `
                <div class="points-detail-row">
                  <div>
                    <strong>
                      ${escapeHtml(
                        detail.veranstaltung ||
                        'Veranstaltung'
                      )}
                    </strong>

                    <span>
                      ${escapeHtml(
                        detail.liste ||
                        'Einsatz'
                      )}
                    </span>
                  </div>

                  <strong>
                    ${formatNumber(detail.punkte)}
                    ${escapeHtml(label)}
                  </strong>
                </div>
              `)
              .join('')
          : `
            <div class="no-entries">
              Für diesen Namen wurden im aktuellen Vereinsjahr
              keine Eintragungen gefunden.
            </div>
          `}
      </div>
    </section>
  `;
}

function metric(
  label,
  value,
  suffix
) {
  return `
    <div class="points-metric">
      <span>${escapeHtml(label)}</span>

      <strong>
        ${formatNumber(value)}
      </strong>

      ${suffix
        ? `<small>${escapeHtml(suffix)}</small>`
        : ''}
    </div>
  `;
}

function normalizePersonName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase(
      'de-DE'
    );
}

function formatNumber(value) {
  return Number(value || 0)
    .toLocaleString(
      'de-DE',
      {
        maximumFractionDigits:
          2
      }
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
