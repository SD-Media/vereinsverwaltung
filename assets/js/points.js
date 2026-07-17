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
    'Meine Eintragungen',
    'Persönliche Eintragungen und Soll-Ist-Stand prüfen'
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

  const tenantName =
    getStoreSnapshot()
      .frontendData
      .einrichtungsname ||
    'Verein';

  target.innerHTML = `
    <section class="personal-points-card">
      <div class="print-points-title">
        Einsätze ${escapeHtml(tenantName)}
      </div>
      <header>
        <div>
          <span class="eyebrow personal-points-name">
            ${escapeHtml(result.name)}
          </span>
        </div>

        <div class="personal-points-actions">
          <button type="button" class="button button-secondary print-hide" id="printPersonalPointsButton">Drucken / als PDF speichern</button>
        </div>
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

        ${differenceMetric(
          Number(result.punkte || 0) - Number(targetValue || 0),
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
        <h3>Berücksichtigte Listen</h3>

        ${result.details &&
          result.details.length
          ? result.details
              .map(detail => `
                ${renderPointDetail(detail, label)}
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

  const printButton = target.querySelector('#printPersonalPointsButton');
  if (printButton) printButton.addEventListener('click', () => window.print());

}


function differenceMetric(difference, suffix) {
  const value = Number(difference || 0);
  const cssClass = value > 0 ? 'is-positive' : value < 0 ? 'is-negative' : 'is-neutral';
  return `<div class="points-metric difference-metric ${cssClass}"><span>Differenz</span><strong>${value > 0 ? '+' : ''}${formatNumber(value)}</strong>${suffix ? `<small>${escapeHtml(suffix)}</small>` : ''}</div>`;
}

function renderPointDetail(detail, label) {
  const list = findPointListDetails_(detail);
  const date = detail.datum || (list ? list.datum : '');
  const time = detail.uhrzeit || (list ? list.uhrzeit : '');
  const responsible = detail.verantwortlich || (list ? list.verantwortlich : '');
  return `<div class="points-detail-row"><div><strong>${escapeHtml(detail.veranstaltung || 'Veranstaltung')}</strong><span class="points-detail-title">${escapeHtml(detail.liste || 'Liste')}</span><div class="points-detail-meta">${date ? `<span>${escapeHtml(date)}</span>` : ''}${time ? `<span>${escapeHtml(time)} Uhr</span>` : ''}${responsible ? `<span>Verantwortlich: ${escapeHtml(responsible)}</span>` : ''}</div></div><strong>${formatNumber(detail.punkte)} ${escapeHtml(label)}</strong></div>`;
}

function findPointListDetails_(detail) {
  const data = getStoreSnapshot().frontendData;
  if (!data || !data.veranstaltungen) return null;
  const events = [].concat(data.veranstaltungen.anstehend || [], data.veranstaltungen.vergangen || [], data.veranstaltungen.ohneDatum || []);
  for (const event of events) {
    const list = (event.listen || []).find(item => (detail.listenId && item.id === detail.listenId) || (!detail.listenId && String(item.titel || '') === String(detail.liste || '') && String(event.titel || '') === String(detail.veranstaltung || '')));
    if (list) return list;
  }
  return null;
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
