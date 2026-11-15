'use strict';

const icons = {
  today: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  history: '<rect x="4" y="12" width="3" height="8" rx="1"/><rect x="10.5" y="8" width="3" height="12" rx="1"/><rect x="17" y="4" width="3" height="16" rx="1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2"/>',
  day: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19m0-14-1.5 1.5m-11 11L5 19"/>',
  night: '<path d="M20.5 15a8.5 8.5 0 0 1-11.6-11A8.6 8.6 0 1 0 20.5 15z"/><path d="M17.5 3.5v5m-2.5-2.5h5"/>',
  quran: '<path d="M12 6c-2.5-2.2-5.2-2.5-9-2v14c3.8-.5 6.5-.2 9 2 2.5-2.2 5.2-2.5 9-2V4c-3.8-.5-6.5-.2-9 2zm0 0v14"/>',
  rnk: '<rect x="5" y="3" width="14" height="5" rx="1.5"/><rect x="3" y="8" width="16" height="6" rx="1.5"/><rect x="5" y="14" width="16" height="6" rx="1.5"/><path d="M8 11h6m-5 6h7"/>',
  pirlanti: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5a2.5 2.5 0 0 0 0 5H20v-5M4 5.5v15M8 8h8m-8 4h6"/>',
  vaazlar: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="12" width="5" height="9" rx="2"/><rect x="16" y="12" width="5" height="9" rx="2"/>'
};
icons.cevsen = '<path d="M12 2c3 2.5 5.7 3.6 9.2 4.2v5.1c0 5.6-3.6 9.1-9.2 11.7-5.6-2.6-9.2-6.1-9.2-11.7V6.2C6.3 5.6 9 4.5 12 2z" fill="#244c38" stroke="#cba761"/><path d="M12 18V9m0 4c-3.3 0-4.5-2.2-4.5-3.1 2.1.1 3.9.8 4.5 3.1zm0 2.5c3.1 0 4.8-2 4.8-3.2-2.6.2-4.1.8-4.8 3.2zm0-3.5c-1.6-1.7-1.6-3.4 0-5 1.6 1.6 1.6 3.3 0 5z" stroke="#e7c47d"/>';
const icon = name => `<svg class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

const readings = [
  { id: 'quran', title: 'Quran', min: 5, milestone: 10 },
  { id: 'rnk', title: 'RNK', subtitle: 'Tafsir', min: 5 },
  { id: 'cevsen', title: 'Cevsen', min: 10, milestone: 20 },
  { id: 'pirlanti', title: 'Pirlanti', min: 5 }
];
const dates = [
  { date: '2026-12-10', title: 'Regaib Kandili', note: 'Evening · Üç Aylar begins' },
  { date: '2027-01-04', title: 'Miraç Kandili', note: 'Evening' },
  { date: '2027-01-22', title: 'Berat Kandili', note: 'Evening' },
  { date: '2027-02-08', title: 'Ramadan begins', note: 'First day of fasting' }
];
const views = { today: 'Today', history: 'History', calendar: 'Calendar' };
const formatDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const formatToday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const storageKey = 'gravity.v1';
const view = document.querySelector('#view');
const nav = document.querySelector('nav');
const settings = document.querySelector('#settings');
const appearance = document.querySelector('#appearance');
const listening = document.querySelector('#listening');
const notice = document.querySelector('#announcement');
const toast = document.querySelector('#toast');
let state = readState();
let activeView;
let activeDay;
let lastAction;
let hideToast;

function readState() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? { days: {}, theme: 'auto' };
  } catch {
    return { days: {}, theme: 'auto' };
  }
}

function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function dateKey(date = new Date()) {
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromKey(key) {
  return new Date(`${key}T12:00:00`);
}

function currentView() {
  const hash = location.hash.slice(1);
  return Object.hasOwn(views, hash) ? hash : 'today';
}

function pageCount(count) {
  return `${count} ${count === 1 ? 'page' : 'pages'}`;
}

function dateRecord(key) {
  return state.days[key] ??= { pages: {}, listening: [] };
}

function coordinates() {
  if (state.coordinates) return state.coordinates;
  return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Qyzylorda'
    ? { lat: 44.8461, lon: 65.5044, estimated: true }
    : null;
}

// NOAA fractional-year approximation. The horizon includes standard atmospheric refraction.
function daylight(now, coords) {
  if (!coords) return now.getHours() >= 6 && now.getHours() < 18;
  const radians = Math.PI / 180;
  const year = now.getFullYear();
  const day = (Date.UTC(year, now.getMonth(), now.getDate()) - Date.UTC(year, 0, 1)) / 86400000;
  const yearLength = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
  const localMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const gamma = (2 * Math.PI / yearLength) * (day + (localMinutes / 60 - 12) / 24);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const hourAngle = (localMinutes + now.getTimezoneOffset() + equation + 4 * coords.lon) * radians / 4 - Math.PI;
  const lat = coords.lat * radians;
  const cosineZenith = Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  return cosineZenith >= Math.cos(90.833 * radians);
}

function syncTheme(now = new Date()) {
  const theme = state.theme === 'auto' ? (daylight(now, coordinates()) ? 'day' : 'night') : state.theme;
  const shown = activeView === 'calendar' ? 'calendar' : theme;
  document.documentElement.dataset.theme = shown;
  document.querySelector('meta[name=theme-color]').content = { day: '#f6f3e9', night: '#11241c', calendar: '#111a2b' }[shown];
  const headerTheme = shown === 'day' ? 'day' : 'night';
  if (appearance.dataset.icon !== headerTheme) {
    appearance.innerHTML = icon(headerTheme);
    appearance.dataset.icon = headerTheme;
  }
}

function hero(title, label, subtitle, tone = '') {
  return `<section class="hero ${tone}"><p class="eyebrow">${label}</p><h1>${title}</h1><p>${subtitle}</p></section>`;
}

function segmentColors(count, minimum) {
  const sector = 360 / minimum;
  const stops = Array.from({ length: minimum }, (_, index) => {
    const color = index < count ? 'var(--accent)' : 'var(--track)';
    return `var(--card) ${index * sector}deg ${index * sector + 3}deg, ${color} ${index * sector + 3}deg ${(index + 1) * sector}deg`;
  });
  return `conic-gradient(from -1.5deg, ${stops.join(', ')})`;
}

function updateRing(button, item, count) {
  button.style.setProperty('--segments', segmentColors(count, item.min));
  button.querySelector('.ring-value').textContent = count;
  button.querySelector('.ring-value').classList.toggle('compact', count >= 1000);
  button.querySelector('small').textContent = count === 1 ? 'page' : 'pages';
  button.setAttribute('aria-label', `Add one ${item.title} page. ${pageCount(count)} read. Daily minimum ${item.min}.${count >= item.min ? ' Minimum reached.' : ''}`);
}

function weekListening(now) {
  const start = new Date(now);
  start.setDate(now.getDate() - (now.getDay() + 6) % 7);
  const monday = dateKey(start);
  const today = dateKey(now);
  return Object.entries(state.days).filter(([day]) => day >= monday && day <= today)
    .reduce((total, [, record]) => total + record.listening.length, 0);
}

function todayView(now) {
  const count = weekListening(now);
  const next = dates.find(event => event.date >= activeDay);
  const preview = next ? `<section class="night-card"><p class="eyebrow">Sacred Nights</p><h2>${next.title}</h2><p>${formatDate.format(dateFromKey(next.date))}</p><a href="#calendar">View calendar →</a></section>` : '';
  view.innerHTML = hero('Today', formatToday.format(now), 'Tap a ring to log one page.') + `
    <div class="layout">
      <section aria-labelledby="daily-heading">
        <div class="section-bar"><h2 id="daily-heading">Daily reading</h2><span id="minimum-count"></span></div>
        <div class="reading-list">${readings.map(item => `
          <article class="reading-row">
            <span class="reading-icon ${item.id === 'cevsen' ? 'shield' : ''}">${icon(item.id)}</span>
            <div class="reading-text"><h3>${item.title}</h3><p>${item.subtitle ? item.subtitle + ' · ' : ''}${item.min}-page minimum${item.milestone ? ' · Aim for ' + item.milestone : ''}</p></div>
            <button class="ring" type="button" data-reading="${item.id}"><span class="ring-center" aria-hidden="true"><span class="ring-value"></span><small></small></span></button>
          </article>`).join('')}</div>
      </section>
      <aside class="aside">
        <section class="panel"><div class="section-bar"><h2>Vaazlar</h2>${icon('vaazlar')}</div>
          <p class="eyebrow weekly">${count ? `${count} logged this week` : 'Optional weekly listening'}</p>
          <button class="action" type="button" id="log-listening">+ Log listening</button></section>
        ${preview}
      </aside>
    </div>`;
  updateReadingProgress();
}

function updateReadingProgress() {
  const record = state.days[activeDay];
  let completed = 0;
  for (const reading of readings) {
    const count = record?.pages[reading.id] ?? 0;
    updateRing(view.querySelector(`[data-reading="${reading.id}"]`), reading, count);
    completed += Number(count >= reading.min);
  }
  document.querySelector('#minimum-count').textContent = `${completed} of 4 minimums met`;
}

function calendarView() {
  view.innerHTML = hero('Sacred Nights', 'December 2026 – February 2027', 'Road to Ramadan', 'calendar-hero') + `
    <section class="cal-wrap" aria-label="Calendar dates">
      <ol class="timeline">${dates.map(event => `<li><div><h2>${event.title}</h2><p>${event.note}</p></div><time datetime="${event.date}">${formatDate.format(dateFromKey(event.date))}</time></li>`).join('')}</ol>
      <p class="detail">Dates follow Türkiye’s Diyanet calendar. Local observance may vary.
        <a href="https://diyanet.gov.tr/dini-gun-geceler" target="_blank" rel="noopener">2026 dates</a> ·
        <a href="https://vakithesaplama.diyanet.gov.tr/icerik.php?icerik=154" target="_blank" rel="noopener">2027 dates</a>
      </p>
    </section>`;
}

function historyView() {
  view.innerHTML = hero('History', 'Reading journal', 'Your daily reading and listening log.') + '<section class="history-wrap" aria-label="Previous entries"></section>';
  const wrap = view.querySelector('.history-wrap');
  const days = Object.entries(state.days)
    .filter(([, record]) => Object.values(record.pages).some(Boolean) || record.listening.length)
    .sort(([a], [b]) => b.localeCompare(a));
  if (!days.length) {
    wrap.innerHTML = '<div class="panel"><h2>No entries yet</h2><p>Log a page or a listening session to see it here.</p><a class="action" href="#today">Go to Today</a></div>';
    return;
  }

  for (const [day, record] of days) {
    const entry = document.createElement('details');
    const total = Object.values(record.pages).reduce((sum, count) => sum + count, 0);
    entry.innerHTML = `<summary><strong>${day === activeDay ? 'Today · ' : ''}${formatDate.format(dateFromKey(day))}</strong><span>${pageCount(total)}</span></summary>
      <dl>${readings.map(item => `<dt>${item.title}</dt><dd>${pageCount(record.pages[item.id] ?? 0)}</dd>`).join('')}</dl>`;
    if (record.listening.length) {
      const log = document.createElement('div');
      log.className = 'history-log';
      log.innerHTML = '<strong>Vaazlar</strong><ul></ul>';
      for (const session of record.listening) {
        const line = document.createElement('li');
        line.textContent = session.title ? `${session.title} · ${session.format}` : session.format;
        log.querySelector('ul').append(line);
      }
      entry.append(log);
    }
    wrap.append(entry);
  }
}

function render(now = new Date()) {
  activeDay = dateKey(now);
  activeView = currentView();
  syncTheme(now);
  nav.innerHTML = Object.entries(views).map(([key, text]) => `
    <a href="#${key}" ${key === activeView ? 'aria-current="page"' : ''}>${icon(key)}${text}</a>`).join('');
  if (activeView === 'today') todayView(now);
  if (activeView === 'calendar') calendarView();
  if (activeView === 'history') historyView();
}

function feedback(message, action, saved) {
  lastAction = action;
  document.querySelector('#toast-message').textContent = saved ? message : `${message} · Storage unavailable`;
  notice.textContent = document.querySelector('#toast-message').textContent;
  toast.hidden = false;
  clearTimeout(hideToast);
  hideToast = setTimeout(() => { toast.hidden = true; }, 4300);
}

function addReading(button) {
  const key = dateKey();
  const item = readings.find(reading => reading.id === button.dataset.reading);
  const record = dateRecord(key);
  const count = (record.pages[item.id] ?? 0) + 1;
  record.pages[item.id] = count;
  const saved = saveState();
  if (key !== activeDay) {
    render();
    button = view.querySelector(`[data-reading="${item.id}"]`);
  } else {
    updateReadingProgress();
  }
  if (count >= item.min) {
    button.classList.remove('shine', 'milestone');
    void button.offsetWidth;
    button.classList.add(count === item.min || count === item.milestone ? 'milestone' : 'shine');
  }
  const message = count === item.min ? `${item.title} minimum reached` : `${item.title} · ${pageCount(count)} today`;
  feedback(message, { key, reading: item.id }, saved);
}

view.addEventListener('click', event => {
  const ring = event.target.closest('button[data-reading]');
  if (ring) addReading(ring);
  if (event.target.closest('#log-listening')) {
    listening.querySelector('form').reset();
    listening.returnValue = 'cancel';
    listening.showModal();
  }
});

listening.addEventListener('close', () => {
  if (listening.returnValue !== 'save') return;
  const form = new FormData(listening.querySelector('form'));
  const key = dateKey();
  const session = { id: crypto.randomUUID?.() ?? String(Date.now()), title: form.get('title').trim(), format: form.get('format') };
  dateRecord(key).listening.push(session);
  const saved = saveState();
  render();
  view.querySelector('#log-listening')?.focus();
  feedback('Listening logged', { key, session: session.id }, saved);
});

document.querySelector('#undo').addEventListener('click', () => {
  if (!lastAction) return;
  const { key, reading, session } = lastAction;
  const record = dateRecord(key);
  if (reading) record.pages[reading] = Math.max(0, (record.pages[reading] ?? 0) - 1);
  if (session) record.listening = record.listening.filter(entry => entry.id !== session);
  notice.textContent = saveState() ? 'Last entry undone' : 'Last entry undone for this visit';
  lastAction = null;
  toast.hidden = true;
  render();
  const control = reading ? view.querySelector(`[data-reading="${reading}"]`) : view.querySelector('#log-listening');
  (control ?? view).focus({ preventScroll: true });
});

const locate = document.querySelector('#locate');
const status = document.querySelector('#location-status');
function locationStatus() {
  const coord = coordinates();
  status.textContent = coord?.estimated
    ? 'Automatic uses approximate sunrise and sunset for Qyzylorda. Use your location for a closer estimate.'
    : coord ? 'Automatic follows sunrise and sunset near your last saved location.'
      : 'Allow location for local sunrise and sunset. Until then, Automatic switches at 6 am and 6 pm.';
}

appearance.addEventListener('click', () => {
  settings.querySelector(`[value="${state.theme}"]`).checked = true;
  locationStatus();
  settings.showModal();
});
settings.addEventListener('change', event => {
  if (event.target.name !== 'theme') return;
  state.theme = event.target.value;
  const saved = saveState();
  syncTheme();
  if (!saved) status.textContent = 'Your browser could not save this preference.';
});
locate.addEventListener('click', () => {
  if (!navigator.geolocation) {
    status.textContent = 'Location is unavailable in this browser.';
    return;
  }
  locate.disabled = true;
  status.textContent = 'Finding your location…';
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    state.coordinates = { lat: Number(latitude.toFixed(2)), lon: Number(longitude.toFixed(2)) };
    const saved = saveState();
    syncTheme();
    locationStatus();
    if (!saved) status.textContent = 'Location is active for this visit. Your browser could not save it.';
    locate.disabled = false;
  }, () => {
    status.textContent = 'Location could not be updated. Check Safari’s location permissions and try again.';
    locate.disabled = false;
  }, { timeout: 12000, maximumAge: 600000 });
});

function syncClock() {
  const now = new Date();
  if (dateKey(now) !== activeDay) render(now);
  else syncTheme(now);
}
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
});
window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) {
    state = readState();
    render();
  }
});
window.addEventListener('pageshow', syncClock);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) syncClock();
});
setInterval(syncClock, 15000);
render();
