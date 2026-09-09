const runtime = window.FIXY_EFFIX_CONFIG ?? {};
const appScriptUrl = document.currentScript?.src ?? window.location.href;
const assetBase = new URL('assets/', appScriptUrl);

function apiBase(value) {
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    return url.protocol === 'https:' || (local && url.protocol === 'http:') ? url.origin : '';
  } catch {
    return '';
  }
}

const API = apiBase(runtime.apiBase);
const services = [
  { id: 'evaluate', title: 'Estoy evaluando Argentina', detail: 'Quiero entender la viabilidad y los próximos pasos.', duration: 15 },
  { id: 'launch', title: 'Quiero montar una operación local', detail: 'Necesito almacenamiento, preparación, distribución e integraciones.', duration: 15 },
  { id: 'scale', title: 'Ya opero y quiero escalar', detail: 'Busco mejorar costos, capacidad o nivel de servicio.', duration: 15 },
];
const advisors = {
  gonzalo: {
    id: 'gonzalo',
    name: 'Gonzalo Jácome',
    role: 'Ejecutivo de cuentas',
    image: new URL('gonzalo.webp', assetBase).href,
  },
  micaela: {
    id: 'micaela',
    name: 'Micaela Pucheta',
    role: 'Ejecutiva de cuentas',
    image: new URL('micaela.webp', assetBase).href,
  },
};
const inPersonDateKeys = ['2026-10-16', '2026-10-17', '2026-10-18'];
const panel = document.querySelector('#panel');
const progressItems = [...document.querySelectorAll('.progress-row span')];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function dateKey(date, timeZone = 'America/Argentina/Buenos_Aires') {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function virtualDateKeys() {
  const output = [];
  const today = new Date(`${dateKey(new Date(), 'America/Bogota')}T12:00:00-05:00`);
  for (let offset = 0; output.length < 3 && offset < 60; offset += 1) {
    const candidate = new Date(today);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const key = dateKey(candidate);
    if (![0, 6].includes(candidate.getUTCDay()) && key <= '2026-10-16') output.push(key);
  }
  return output;
}

function keyAsDate(key) {
  return new Date(`${key}T12:00:00-05:00`);
}

function safeMeetUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'meet.google.com' ? url.href : '';
  } catch {
    return '';
  }
}

let state = {
  view: 'modality',
  modality: '',
  service: 'evaluate',
  date: virtualDateKeys()[0] ?? '',
  slot: null,
  advisor: '',
  slots: [],
  loading: false,
  error: '',
  errorCode: '',
  result: null,
  showAllTimes: false,
  requestId: '',
  publicConfig: null,
};

let recaptchaScript;

function selectedService() {
  if (state.modality === 'in_person') {
    return { id: 'effix', title: 'Encuentro en Feria EFFIX', detail: 'Una conversación presencial en el stand AM74.', duration: 15 };
  }
  return services.find((service) => service.id === state.service) ?? services[0];
}

function stepState() {
  if (state.view === 'modality') return { current: 1, total: 5 };
  if (state.modality === 'in_person') {
    return { current: { schedule: 2, advisor: 3, form: 4 }[state.view] ?? 1, total: 4 };
  }
  return { current: { service: 2, schedule: 3, advisor: 4, form: 5 }[state.view] ?? 1, total: 5 };
}

function progress() {
  const { current, total } = stepState();
  progressItems.forEach((element, index) => {
    element.classList.toggle('hidden', index >= total);
    element.classList.toggle('active', index < current);
  });
}

function serviceCard(service) {
  return `<button class="service ${state.service === service.id ? 'selected' : ''}" data-service="${service.id}"><span class="radio"></span><span><strong>${service.title}</strong><small>${service.detail}</small></span><b>${service.duration} min</b></button>`;
}

function advisorCard(id) {
  const advisor = advisors[id];
  if (!advisor) return '';
  const role = state.modality === 'in_person' ? 'Te espera en el stand AM74' : advisor.role;
  return `<button class="advisor ${state.advisor === id ? 'selected' : ''}" data-advisor="${id}"><img src="${advisor.image}" alt="${advisor.name}" referrerpolicy="no-referrer"><span><strong>${advisor.name}</strong><small>${role}</small></span><span class="radio"></span></button>`;
}

function modalityView() {
  return `<div class="panel"><span class="step-label">ELEGÍ LA MODALIDAD</span><h2>¿Cómo querés conversar?</h2><p class="sub">En ambos casos reservás 15 minutos y consultamos la agenda real.</p><div class="option-list">
    <button class="modality" data-modality="virtual"><span class="modality-icon">◫</span><span><strong>Reunión virtual</strong><small>La experiencia habitual de Fixy Reservas, con Google Meet.</small></span><b>Micaela o Gonzalo</b></button>
    <button class="modality presencial" data-modality="in_person"><span class="modality-icon">⌖</span><span><strong>Encuentro presencial</strong><small>Feria EFFIX · Pabellón Amarillo · Stand AM74.</small></span><b>Sólo Gonzalo</b></button>
  </div></div>`;
}

function serviceView() {
  return `<div class="panel"><button class="back" data-view="modality">← Cambiar modalidad</button><span class="step-label">PASO 2 DE 5</span><h2>¿En qué etapa está tu marca?</h2><p class="sub">No necesitás saber qué servicio elegir; lo definimos juntos en la reunión.</p><div class="option-list">${services.map(serviceCard).join('')}</div><button class="primary" data-view="schedule">Elegir día y horario →</button></div>`;
}

function dateButton(key) {
  const date = keyAsDate(key);
  const timeZone = 'America/Bogota';
  return `<button class="${state.date === key ? 'selected' : ''}" data-date="${key}"><small>${date.toLocaleDateString('es-AR', { weekday: 'short', timeZone }).replace('.', '').toUpperCase()}</small><strong>${Number(key.slice(-2))}</strong><span>${date.toLocaleDateString('es-AR', { month: 'short', timeZone }).replace('.', '').toUpperCase()}</span></button>`;
}

function timeGroups() {
  return [
    { label: 'Mañana', slots: state.slots.filter((slot) => Number(slot.time.slice(0, 2)) < 13) },
    { label: 'Tarde', slots: state.slots.filter((slot) => Number(slot.time.slice(0, 2)) >= 13) },
  ].filter((group) => group.slots.length);
}

function groupedTimes() {
  const groups = timeGroups();
  if (!groups.length) return '<p class="sub">No quedan horarios disponibles para este día.</p>';
  const hidden = groups.some((group) => group.slots.length > 3);
  return `<div class="time-groups">${groups.map((group) => `<section class="time-group"><h3>${group.label}</h3><div class="times">${(state.showAllTimes ? group.slots : group.slots.slice(0, 3)).map((slot) => `<button class="${state.slot?.start === slot.start ? 'selected' : ''}" data-start="${escapeHtml(slot.start)}">${escapeHtml(slot.time)}</button>`).join('')}</div></section>`).join('')}${hidden ? `<button class="show-times" data-expand>${state.showAllTimes ? 'Ver menos horarios' : 'Ver todos los horarios'}</button>` : ''}</div>`;
}

function scheduleView() {
  const { current, total } = stepState();
  const inPerson = state.modality === 'in_person';
  const keys = inPerson ? inPersonDateKeys : virtualDateKeys();
  const backLabel = inPerson ? 'Cambiar modalidad' : 'Volver';
  const stepLabel = inPerson
    ? `PASO ${current} DE ${total} · ENCUENTRO PRESENCIAL · EFFIX 2026`
    : `PASO ${current} DE ${total}`;
  const title = inPerson ? 'Elegí cuándo nos vemos en EFFIX' : 'Elegí cuándo te queda mejor';
  const context = inPerson
    ? 'Stand Fixy AM74 · Pabellón Amarillo.<br>Horarios de Medellín, Colombia.'
    : 'Disponibilidad real · Horarios mostrados en Colombia. El ejecutivo los recibe en hora argentina.';
  return `<div class="panel"><button class="back" data-view="${inPerson ? 'modality' : 'service'}">← ${backLabel}</button><span class="step-label">${stepLabel}</span><h2>${title}</h2><p class="sub">${context}</p><div class="dates">${keys.map(dateButton).join('')}</div>${state.loading ? '<p class="loading">Cargando horarios…</p>' : groupedTimes()}${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ''}<button class="primary" ${state.slot ? '' : 'disabled'} data-view="advisor">Ver ejecutivo${state.modality === 'virtual' ? 's' : ''} disponible${state.modality === 'virtual' ? 's' : ''} →</button></div>`;
}

function advisorView() {
  const { current, total } = stepState();
  const available = state.slot?.advisors ?? [];
  return `<div class="panel"><button class="back" data-view="schedule">← Cambiar horario</button><span class="step-label">PASO ${current} DE ${total}</span><h2>¿Con quién querés conversar?</h2><p class="sub">Estas personas están libres en el horario seleccionado.</p><div class="advisor-grid">${available.map(advisorCard).join('')}</div><button class="primary" ${state.advisor ? '' : 'disabled'} data-view="form">Completar mis datos →</button></div>`;
}

function meetingDate() {
  if (!state.slot) return '';
  const timeZone = 'America/Bogota';
  return new Date(state.slot.start).toLocaleString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone,
  });
}

function formView() {
  const { current, total } = stepState();
  const service = selectedService();
  const place = state.modality === 'in_person' ? 'Stand AM74' : 'Google Meet';
  const intro = state.modality === 'in_person' ? 'Al confirmar enviaremos la invitación con el punto de encuentro.' : 'Al confirmar crearemos la reunión de Google Meet.';
  return `<div class="panel"><button class="back" data-view="advisor">← Cambiar ejecutivo</button><span class="step-label">PASO ${current} DE ${total}</span><h2>¿Cómo te contactamos?</h2><p class="sub">${intro}</p><form id="booking-form"><label>Nombre y apellido<input name="name" autocomplete="name" maxlength="120" required></label><label>Empresa<input name="company" autocomplete="organization" maxlength="160" required></label><label>WhatsApp<input name="whatsapp" type="tel" autocomplete="tel" maxlength="40" required></label><label>Email<input name="email" type="email" autocomplete="email" maxlength="254" required></label><label class="honeypot" aria-hidden="true">Sitio web<input name="website" tabindex="-1" autocomplete="off"></label><div class="mini-summary"><span>${service.title}</span><strong>${escapeHtml(meetingDate())}</strong><span>${advisors[state.advisor].name} · ${place}</span></div><label class="consent"><input name="consent" type="checkbox" required><span>Acepto que Fixy use estos datos para contactarme y coordinar esta reunión.</span></label>${state.error ? `<p class="form-error" role="alert">${escapeHtml(state.error)}</p>` : ''}<button class="primary" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Confirmando…' : 'Confirmar reunión →'}</button></form></div>`;
}

function successView() {
  const service = selectedService();
  const advisor = advisors[state.advisor];
  const confirmedDate = new Date(state.slot.start);
  const timeZone = 'America/Bogota';
  const meetLink = safeMeetUrl(state.result?.meetLink);
  const message = state.modality === 'in_person'
    ? 'La invitación de Google Calendar con el punto de encuentro fue enviada por email.'
    : 'La invitación de Google Calendar con el Meet fue enviada por email.';
  return `<div class="success"><div class="success-icon">✓</div><span class="eyebrow">REUNIÓN CONFIRMADA</span><h2>¡Tu reunión quedó agendada!</h2><p>${message}</p><div class="confirmed-advisor"><img src="${advisor.image}" alt="${advisor.name}" referrerpolicy="no-referrer"><span><small>Tu ejecutivo</small><strong>${advisor.name}</strong></span></div><div class="summary details"><div><span>${state.modality === 'virtual' ? 'Etapa' : 'Encuentro'}</span><strong>${service.title}</strong></div><div><span>Fecha</span><strong>${confirmedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone })}</strong></div><div><span>Horario</span><strong>${confirmedDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone })}</strong></div><div><span>Duración</span><strong>15 minutos</strong></div></div>${meetLink ? `<a class="primary" href="${meetLink}" rel="noreferrer">Abrir Google Meet</a>` : ''}${state.modality === 'in_person' ? '<div class="location-result"><strong>Fixy · Stand AM74</strong><br>Plaza Mayor Medellín · Pabellón Amarillo</div>' : ''}</div>`;
}

function closedView() {
  return `<div class="closed"><div class="closed-icon">×</div><span class="eyebrow">AGENDA CERRADA</span><h2>La campaña EFFIX finalizó.</h2><p>${escapeHtml(state.error || 'Ya no se aceptan nuevas reservas desde esta página.')}</p><a class="primary" href="https://fixy.com.ar/reservas/">Ir a Fixy Reservas</a></div>`;
}

function render() {
  progress();
  if (state.result) panel.innerHTML = successView();
  else if (state.errorCode === 'CAMPAIGN_CLOSED') panel.innerHTML = closedView();
  else if (state.view === 'modality') panel.innerHTML = modalityView();
  else if (state.view === 'service') panel.innerHTML = serviceView();
  else if (state.view === 'schedule') panel.innerHTML = scheduleView();
  else if (state.view === 'advisor') panel.innerHTML = advisorView();
  else panel.innerHTML = formView();

  panel.querySelectorAll('[data-modality]').forEach((button) => {
    button.onclick = () => selectModality(button.dataset.modality);
  });
  panel.querySelectorAll('[data-service]').forEach((button) => {
    button.onclick = () => {
      state.service = button.dataset.service;
      state.requestId = '';
      render();
    };
  });
  panel.querySelectorAll('[data-date]').forEach((button) => {
    button.onclick = () => {
      state.date = button.dataset.date;
      loadSlots();
    };
  });
  panel.querySelectorAll('[data-start]').forEach((button) => {
    button.onclick = () => {
      state.slot = state.slots.find((slot) => slot.start === button.dataset.start) ?? null;
      state.advisor = '';
      state.requestId = '';
      render();
    };
  });
  panel.querySelectorAll('[data-expand]').forEach((button) => {
    button.onclick = () => {
      state.showAllTimes = !state.showAllTimes;
      render();
    };
  });
  panel.querySelectorAll('[data-advisor]').forEach((button) => {
    button.onclick = () => {
      state.advisor = button.dataset.advisor;
      state.requestId = '';
      render();
    };
  });
  panel.querySelectorAll('[data-view]').forEach((button) => {
    button.onclick = () => {
      if (!button.disabled) navigate(button.dataset.view);
    };
  });
  const form = panel.querySelector('#booking-form');
  if (form) form.onsubmit = submitBooking;
}

function selectModality(modality) {
  state.modality = modality;
  state.service = modality === 'in_person' ? 'effix' : 'evaluate';
  state.date = modality === 'in_person' ? inPersonDateKeys[0] : (virtualDateKeys()[0] ?? '');
  state.slot = null;
  state.advisor = '';
  state.slots = [];
  state.error = '';
  state.requestId = '';
  state.view = modality === 'in_person' ? 'schedule' : 'service';
  render();
  if (state.view === 'schedule') loadSlots();
}

function navigate(view) {
  state.view = view;
  state.error = '';
  if (view === 'schedule' && !state.slots.length) loadSlots();
  else render();
  panel.closest('.booking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadSlots() {
  if (!state.date) return;
  state.loading = true;
  state.error = '';
  state.errorCode = '';
  state.slot = null;
  state.advisor = '';
  state.requestId = '';
  state.showAllTimes = false;
  render();
  try {
    if (!API) throw new Error('Falta configurar la URL pública del servicio EFFIX.');
    const query = new URLSearchParams({
      modality: state.modality,
      service: selectedService().id,
      date: state.date,
      ...(state.modality === 'in_person' ? { advisor: 'gonzalo' } : {}),
    });
    const response = await fetch(`${API}/availability?${query}`);
    const data = await response.json();
    if (!response.ok) {
      state.errorCode = data.code || '';
      throw new Error(data.error || 'No pudimos consultar los calendarios.');
    }
    state.slots = Array.isArray(data.slots) ? data.slots : [];
    if (data.partial) state.error = 'Algunos ejecutivos no están disponibles temporalmente.';
  } catch (error) {
    state.slots = [];
    state.error = error.message || 'No pudimos consultar los calendarios. Probá nuevamente.';
  } finally {
    state.loading = false;
    render();
  }
}

function loadRecaptcha(siteKey) {
  if (recaptchaScript) return recaptchaScript;
  recaptchaScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('No pudimos cargar la verificación anti-spam.'));
    document.head.append(script);
  });
  return recaptchaScript;
}

async function captchaToken() {
  if (state.publicConfig?.preview === true) return 'preview-captcha-token';
  const siteKey = state.publicConfig?.recaptchaSiteKey;
  if (!siteKey) throw new Error('Verificación anti-spam no disponible.');
  await loadRecaptcha(siteKey);
  return new Promise((resolve, reject) => {
    window.grecaptcha.enterprise.ready(() => {
      window.grecaptcha.enterprise.execute(siteKey, { action: 'book_effix' }).then(resolve, reject);
    });
  });
}

async function submitBooking(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  state.loading = true;
  state.error = '';
  state.requestId ||= crypto.randomUUID();
  render();
  try {
    const verification = await captchaToken();
    const response = await fetch(`${API}/book`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requestId: state.requestId,
        modality: state.modality,
        service: selectedService().id,
        advisor: state.advisor,
        start: state.slot.start,
        name: formData.get('name'),
        company: formData.get('company'),
        whatsapp: formData.get('whatsapp'),
        email: formData.get('email'),
        website: formData.get('website'),
        consent: formData.get('consent') === 'on',
        captchaToken: verification,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No pudimos confirmar la reunión.');
    state.result = data;
  } catch (error) {
    state.error = error.message || 'No pudimos confirmar la reunión.';
  } finally {
    state.loading = false;
    render();
  }
}

async function boot() {
  render();
  try {
    if (!API) throw new Error('Falta configurar la URL pública del servicio EFFIX.');
    const response = await fetch(`${API}/public-config`);
    if (!response.ok) throw new Error('Configuración de campaña no disponible.');
    state.publicConfig = await response.json();
    if (state.publicConfig.campaignCloseAt && Date.now() >= Date.parse(state.publicConfig.campaignCloseAt)) {
      state.errorCode = 'CAMPAIGN_CLOSED';
      state.error = 'La feria y su agenda temporal ya finalizaron.';
      render();
    }
  } catch (error) {
    state.error = error.message || 'Configuración no disponible.';
  }
}

boot();
