/* script.js */

const TIMELINE_JSON = 'timeline.json';

// DOM elements
const timelineEl = document.getElementById('timeline');
const scrollLeftBtn = document.getElementById('scroll-left');
const scrollRightBtn = document.getElementById('scroll-right');
const sortOrderSel = document.getElementById('sort-order');
const themeSel = document.getElementById('theme-select');
const viewModeSel = document.getElementById('view-mode');

let events = [];

// Always graph view:
let currentView = 'graph';

// Theme Handling
themeSel.addEventListener('change', (e) => {
    document.body.setAttribute('data-theme', e.target.value);
});

// Disable changes to view mode (always graph)
viewModeSel.addEventListener('change', () => {
    // Keep graph enforced
    currentView = 'graph';
    timelineEl.className = 'timeline view-graph';
    renderTimeline();
});

function parseMonth(m) {
    const MONTHS = {
        january: 1, february: 2, march: 3, april: 4,
        may: 5, june: 6, july: 7, august: 8,
        september: 9, october: 10, november: 11, december: 12,
        jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
    };
    if (typeof m === 'string') {
        const v = m.trim().toLowerCase();
        return Number(v) || MONTHS[v] || null;
    }
    return (typeof m === 'number' && m >= 1 && m <= 12) ? m : null;
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

    // Graph positioning
    const startYear = 2010;
    const yearDiff = ev.year - startYear;
    const monthOffset = (ev.__monthNum || 1) / 12;
    const xPos = (yearDiff + monthOffset) * 200 + 50;

    const yStrata = ['50px', '250px', '450px', '150px', '350px'];
    const yPos = yStrata[index % 5];
    card.style.left = `${xPos}px`;
    card.style.top = yPos;

    const accent = document.createElement('span');
    accent.className = 'event-accent';
    if (ev.color) accent.style.background = ev.color;
    card.appendChild(accent);

    const date = document.createElement('div');
    date.className = 'event-date';
    date.textContent = monthYearLabel(ev.__monthNum, ev.year);
    card.appendChild(date);

    const h = document.createElement('h3');
    h.className = 'event-title';
    h.textContent = ev.name || 'Untitled';
    if (ev.color) h.style.color = ev.color;
    card.appendChild(h);

    const desc = document.createElement('div');
    desc.className = 'event-desc';
    desc.textContent = ev.description || '';
    card.appendChild(desc);

    return card;
}

function renderTimeline() {
    timelineEl.innerHTML = '';
    if (!events.length) {
        const empty = document.createElement('div');
        empty.className = 'event';
        empty.textContent = 'No events loaded.';
        timelineEl.appendChild(empty);
        return;
    }

    if (currentView === 'graph') {
        const lastEv = events[events.length - 1];
        const startYear = 2010;
        const width = ((lastEv.year - startYear) * 250) + 500;
        timelineEl.style.width = `${Math.max(width, window.innerWidth)}px`;
    }

    events.forEach((ev, idx) => {
        const el = buildEventCard(ev, idx);
        timelineEl.appendChild(el);
    });
}

async function loadTimeline() {
    try {
        const url = `${TIMELINE_JSON}?t=${Date.now()}`;
        const resp = await fetch(url);
        const json = await resp.json();
        processJson(json);
    } catch (err) {
        timelineEl.innerHTML = `<div class="event">Error loading timeline.</div>`;
    }
}

function processJson(json) {
    events = json.map((e, idx) => {
        const monthNum = parseMonth(e.month);
        const yearNum = Number(e.year);
        return (e.name && yearNum) ? { ...e, year: yearNum, __monthNum: monthNum || 1 } : null;
    }).filter(x => x);

    applySort();
}

function applySort() {
    const order = sortOrderSel.value;
    events.sort((a, b) => order === 'asc'
        ? a.year - b.year || a.__monthNum - b.__monthNum
        : b.year - a.year || b.__monthNum - a.__monthNum
    );
    renderTimeline();
}

function scrollTimelineBy(px) {
    timelineEl.scrollLeft += px;
}

scrollLeftBtn.addEventListener('click', () => scrollTimelineBy(-400));
scrollRightBtn.addEventListener('click', () => scrollTimelineBy(400));
sortOrderSel.addEventListener('change', applySort);

loadTimeline();