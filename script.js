/* script.js */

const TIMELINE_JSON = 'timeline.json';

// DOM elements
const timelineEl = document.getElementById('timeline');
const scrollLeftBtn = document.getElementById('scroll-left');
const scrollRightBtn = document.getElementById('scroll-right');
const sortOrderSel = document.getElementById('sort-order');
const viewModeSel = document.getElementById('view-mode');
const themeSel = document.getElementById('theme-select');

let events = [];
let currentView = 'horizontal';

// Init default view class
timelineEl.classList.add('view-horizontal');

// Theme Handling
themeSel.addEventListener('change', (e) => {
  document.body.setAttribute('data-theme', e.target.value);
});

// View Handling
viewModeSel.addEventListener('change', (e) => {
  currentView = e.target.value;

  // Reset classes
  timelineEl.classList.remove('view-horizontal', 'view-vertical', 'view-graph');
  timelineEl.classList.add(`view-${currentView}`);

  // Rerender (Graph view needs specific positioning calculation)
  renderTimeline();
});

// Month Mapping
const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
};

function parseMonth(m) {
  if (m === undefined || m === null) return null;
  if (typeof m === 'number' && Number.isFinite(m)) {
    const n = Math.trunc(m);
    return (n >= 1 && n <= 12) ? n : null;
  }
  if (typeof m === 'string') {
    const trimmed = m.trim().toLowerCase();
    const n = Number(trimmed);
    if (!Number.isNaN(n) && Number.isFinite(n)) return (n >= 1 && n <= 12) ? n : null;
    return MONTHS[trimmed] || null;
  }
  return null;
}

function monthYearLabel(monthNum, year) {
  if (!year) return '';
  if (!monthNum) return String(year);
  const d = new Date(year, monthNum - 1, 1);
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function buildEventCard(ev, index) {
  const card = document.createElement('article');
  card.className = 'event';
  card.tabIndex = 0;

  // Graph View Positioning Logic
  if (currentView === 'graph') {
    // Calculate X based on date (approx pixels)
    // Assume 2010 is start (0px). 
    // 1 Year = 300px width?
    const startYear = 2010;
    const yearDiff = ev.year - startYear;
    const monthOffset = (ev.__monthNum || 1) / 12;
    const xPos = (yearDiff + monthOffset) * 200 + 50; // 200px per year
    const minYear = window.graphMinYear || 2010; // set during render
    const yearRowHeight = 100; // px
    const yPos = (ev.year - minYear) * yearRowHeight + 50; // +50 for padding

    // X Axis: Month (1-12)
    // 12 columns. Center of column = (month - 0.5) / 12 * 100%
    const monthIndex = ev.__monthNum || 1;
    const xPercent = ((monthIndex - 0.5) / 12) * 100;

    card.style.left = `calc(80px + ${xPercent}%)`; // 80px offset for Y-axis
    card.style.top = `${yPos}px`;
  } else {
    card.style.left = '';
    card.style.top = '';
  }

  // --- Internal Content (Visible in Cards, Hidden in Dots until hover) ---

  // We wrap content in a popup div if in graph mode, or just normal flow?
  // The CSS hides direct children in graph mode .view-graph .event > * { display: none }
  // So we assume the structure below is standard, and we add a specific popup container for graph hover.

  // 1. Standard Content (for Horizontal/Vertical)
  const accent = document.createElement('span');
  accent.className = 'event-accent';
  if (ev.color) accent.style.background = ev.color;
  card.appendChild(accent);

  const dateDiv = document.createElement('div');
  dateDiv.className = 'event-date';
  dateDiv.textContent = monthYearLabel(ev.__monthNum, ev.year);
  card.appendChild(dateDiv);

  const h = document.createElement('h3');
  h.className = 'event-title';
  h.textContent = ev.name || 'Untitled';
  if (ev.color) h.style.color = ev.color;
  card.appendChild(h);

  const desc = document.createElement('div');
  desc.className = 'event-desc';
  desc.textContent = ev.description || '';
  card.appendChild(desc);

  // 2. Popup Content (Duplicated for Grid Hover effect)
  // This is hidden by CSS unless .view-graph is active and hovered
  const popup = document.createElement('div');
  popup.className = 'event-popup';
  popup.innerHTML = `
    <h3>${ev.name}</h3>
    <div class="date">${monthYearLabel(ev.__monthNum, ev.year)}</div>
    <p>${ev.description || ''}</p>
  `;
  card.appendChild(popup);

  return card;
}

function renderTimeline() {
  timelineEl.innerHTML = '';

  if (!events.length) {
    timelineEl.innerHTML = '<div class="event">No events loaded.</div>';
    return;
  }

  // --- GRAPH VIEW SETUP ---
  if (currentView === 'graph') {
    // 1. Calculate Range
    const years = events.map(e => e.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    window.graphMinYear = minYear; // store for buildEventCard

    const totalHeight = (maxYear - minYear + 1) * 100 + 100; // 100px per year + padding
    timelineEl.style.height = `${totalHeight}px`;
    timelineEl.style.width = '100%'; // Full width container

    // 2. Render X-Axis (Months) - Sticky Header
    const xAxis = document.createElement('div');
    xAxis.className = 'graph-axis-x';
    // We need to shift it right by 80px (Y-axis width)
    // Actually CSS handles padding, but the stickiness needs to be inside or outside?
    // Let's rely on CSS flex logic for the 12 columns.
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    monthNames.forEach(m => {
      const label = document.createElement('div');
      label.className = 'graph-month-label';
      label.textContent = m;
      xAxis.appendChild(label);
    });
    timelineEl.appendChild(xAxis);

    // 3. Render Y-Axis (Years)
    for (let y = minYear; y <= maxYear; y++) {
      const yLabel = document.createElement('div');
      yLabel.className = 'graph-axis-y';
      yLabel.textContent = y;
      yLabel.style.top = `${(y - minYear) * 100 + 50 - 10}px`; // center on row
      timelineEl.appendChild(yLabel);
    }
  } else {
    // Reset styles for other views
    timelineEl.style.height = '';
    timelineEl.style.width = '100%';
  }

  // --- RENDER EVENTS ---
  events.forEach((ev, idx) => {
    const el = buildEventCard(ev, idx);
    timelineEl.appendChild(el);
  });
}

// Data Loading
async function loadTimeline() {
  try {
    // GitHub Pages caches heavily; add timestamp to force fresh data
    const url = `${TIMELINE_JSON}?t=${new Date().getTime()}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      // Fallback for some servers that might reject query params on static files (rare but possible)
      if (resp.status === 404) {
        const retry = await fetch(TIMELINE_JSON);
        if (retry.ok) {
          processJson(await retry.json());
          return;
        }
      }
      throw new Error(`HTTP ${resp.status}`);
    }
    const json = await resp.json();
    processJson(json);

  } catch (err) {
    console.warn("Fetch error:", err);

    let msg = `Error loading data: ${err.message}`;
    if (window.location.protocol === 'file:') {
      msg = `<b>Local File Error:</b><br>Browsers block reading JSON files directly from your hard drive (CORS).<br><br>
        To fix:<br>
        1. Push to GitHub Pages (It will work there!)<br>
        2. Or run a local server (e.g., <code>python -m http.server</code>)<br>
        3. Or use VS Code "Live Server" extension.`;
    }

    timelineEl.innerHTML = `<div class="event" style="min-width: 300px; color: #ff6b6b; border-color: #ff6b6b;">${msg}</div>`;
  }
}

function processJson(json) {
  // Normalize
  events = json.map((e, idx) => {
    const monthNum = parseMonth(e.month);
    const yearNum = Number(e.year);
    if (!e.name || !yearNum) return null;
    return {
      ...e,
      year: yearNum,
      __monthNum: monthNum || 1, // default Jan if missing for sorting
      __originalIndex: idx
    };
  }).filter(x => x);

  applySort();
}

function applySort() {
  const order = sortOrderSel.value;
  events.sort((a, b) => {
    if (a.year !== b.year) return order === 'asc' ? a.year - b.year : b.year - a.year;
    return order === 'asc' ? a.__monthNum - b.__monthNum : b.__monthNum - a.__monthNum;
  });
  renderTimeline();
}

function scrollTimelineBy(px) {
  // Vertical view uses window scroll or wrapper scroll? 
  // Our CSS says .timeline has overflow, so we scroll that.

  if (currentView === 'vertical') {
    timelineEl.scrollTop += px;
  } else {
    timelineEl.scrollLeft += px;
  }
}

scrollLeftBtn.addEventListener('click', () => scrollTimelineBy(-400));
scrollRightBtn.addEventListener('click', () => scrollTimelineBy(400));
sortOrderSel.addEventListener('change', applySort);

loadTimeline();
