/* script.js
   Loads timeline.json and renders a horizontal timeline.
   Edit timeline.json to add patches. Each event should include:
     - name (string)         : required
     - description (string)  : required or empty string
     - month (number|string) : month number (1-12) OR month name ("March", "Mar", "mar")
     - year (number)         : 4-digit year (e.g. 2023)
   Optional:
     - id, color

   The script normalizes month/year into a Date for sorting. Invalid events are skipped
   (console warnings) to avoid UI clutter.
*/

const TIMELINE_JSON = 'timeline.json'; // relative path; GitHub Pages serves this

// DOM elements
const timelineEl = document.getElementById('timeline');
const scrollLeftBtn = document.getElementById('scroll-left');
const scrollRightBtn = document.getElementById('scroll-right');
const sortOrderSel = document.getElementById('sort-order');

let events = [];

// month name mapping
const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
};

// Utility: parse month (string or number) -> integer 1-12 or null
function parseMonth(m){
  if(m === undefined || m === null) return null;
  if(typeof m === 'number' && Number.isFinite(m)){
    const n = Math.trunc(m);
    return (n >= 1 && n <= 12) ? n : null;
  }
  if(typeof m === 'string'){
    const trimmed = m.trim().toLowerCase();
    const n = Number(trimmed);
    if(!Number.isNaN(n) && Number.isFinite(n)){
      return (n >= 1 && n <= 12) ? n : null;
    }
    return MONTHS[trimmed] || null;
  }
  return null;
}

// Utility: create a friendly month-year string from numbers
function monthYearLabel(monthNum, year){
  if(!year) return '';
  if(!monthNum) return String(year);
  const d = new Date(year, monthNum - 1, 1);
  return d.toLocaleString(undefined, {month: 'long', year: 'numeric'});
}

// Build event card DOM from event object (expects normalized fields)
function buildEventCard(ev){
  const card = document.createElement('article');
  card.className = 'event';
  card.tabIndex = 0; // focusable

  // accent dot (optional color)
  const accent = document.createElement('span');
  accent.className = 'event-accent';
  if(ev.color) accent.style.background = ev.color;
  else accent.style.background = 'var(--accent)';
  card.appendChild(accent);

  // date (Month Year)
  const date = document.createElement('div');
  date.className = 'event-date';
  date.textContent = monthYearLabel(ev.__monthNum, ev.year);
  card.appendChild(date);

  // title (name)
  const h = document.createElement('h3');
  h.className = 'event-title';
  h.textContent = ev.name || 'Untitled';
  card.appendChild(h);

  // description
  const desc = document.createElement('div');
  desc.className = 'event-desc';
  // Using textContent to be safe: JSON descriptions are expected to be plain text.
  // If you want HTML, you can allow innerHTML, but be careful with untrusted content.
  desc.textContent = ev.description || '';
  card.appendChild(desc);

  return card;
}

// Render events to timeline element
function renderTimeline(){
  timelineEl.innerHTML = ''; // clear
  if(!events.length){
    const empty = document.createElement('div');
    empty.className = 'event';
    empty.textContent = 'No events found in timeline.json';
    timelineEl.appendChild(empty);
    return;
  }
  events.forEach(ev=>{
    const el = buildEventCard(ev);
    timelineEl.appendChild(el);
  });
}

// Fetch timeline.json, validate and update global events array
async function loadTimeline(){
  try{
    const resp = await fetch(TIMELINE_JSON, {cache: "no-store"});
    if(!resp.ok) throw new Error(`Failed to load ${TIMELINE_JSON}: ${resp.status}`);
    const json = await resp.json();
    if(!Array.isArray(json)){
      console.warn('timeline.json should contain a top-level array of events. Got:', json);
      events = [];
    } else {
      // Normalize and validate events
      const normalized = [];
      json.forEach((e, idx) => {
        // Required: name, month, year (description can be empty)
        const name = typeof e.name === 'string' ? e.name.trim() : '';
        const description = typeof e.description === 'string' ? e.description.trim() : '';
        const monthNum = parseMonth(e.month);
        const yearNum = (typeof e.year === 'number' && Number.isFinite(e.year)) ? Math.trunc(e.year) :
                        (typeof e.year === 'string' && /^[0-9]{4}$/.test(e.year.trim()) ? Number(e.year.trim()) : null);

        if(!name){
          console.warn(`Skipping event at index ${idx}: missing or invalid "name".`, e);
          return;
        }
        if(!monthNum){
          console.warn(`Skipping event "${name}" at index ${idx}: invalid "month" ("${e.month}"). Expected 1-12 or month name.`, e);
          return;
        }
        if(!yearNum){
          console.warn(`Skipping event "${name}" at index ${idx}: invalid "year" ("${e.year}"). Expected 4-digit year.`, e);
          return;
        }

        const parsedDate = new Date(yearNum, monthNum - 1, 1);
        normalized.push({
          ...e,
          name,
          description,
          year: yearNum,
          __monthNum: monthNum,
          __parsedDate: parsedDate,
          __originalIndex: idx
        });
      });

      events = normalized;
      applySort(); // initial sort & render
    }
  } catch (err){
    console.error(err);
    timelineEl.innerHTML = `<div class="event">Error loading timeline.json — check console for details.</div>`;
  }
}

// Apply sorting according to select value
function applySort(){
  const order = sortOrderSel.value;
  events.sort((a,b)=>{
    // sort by year, then month
    if(a.year !== b.year) return order === 'asc' ? a.year - b.year : b.year - a.year;
    if(a.__monthNum !== b.__monthNum) return order === 'asc' ? a.__monthNum - b.__monthNum : b.__monthNum - a.__monthNum;
    return a.__originalIndex - b.__originalIndex;
  });
  renderTimeline();
}

// Scrolling helpers
function scrollTimelineBy(px){
  timelineEl.scrollBy({left: px, behavior: 'smooth'});
}

// Event listeners
scrollLeftBtn.addEventListener('click', ()=> scrollTimelineBy(-400));
scrollRightBtn.addEventListener('click', ()=> scrollTimelineBy(400));
sortOrderSel.addEventListener('change', applySort);

// Keyboard: left/right on timeline to scroll
timelineEl.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowLeft') { scrollTimelineBy(-220); e.preventDefault(); }
  if(e.key === 'ArrowRight') { scrollTimelineBy(220); e.preventDefault(); }
  if(e.key === 'Home') { timelineEl.scrollLeft = 0; e.preventDefault(); }
  if(e.key === 'End') { timelineEl.scrollLeft = timelineEl.scrollWidth; e.preventDefault(); }
});

// Initialize
loadTimeline();