(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const menuButton = $('.menu-toggle');
  const mainNav = $('.main-nav');
  const closeMenu = () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    mainNav?.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  };
  menuButton?.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    mainNav.classList.toggle('is-open', !isOpen);
    document.body.classList.toggle('menu-open', !isOpen);
  });
  $$('a', mainNav).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => event.key === 'Escape' && closeMenu());

  const reveals = $$('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(element => element.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    reveals.forEach(element => revealObserver.observe(element));
  }

  // PhoneVideoMockup: set data-video to media/videos/deposito-01.mp4 (or another local path).
  $$('[data-phone-video]').forEach(phone => {
    const video = $('video', phone);
    const fallback = $('.video-fallback', phone);
    const source = phone.dataset.video?.trim();
    if (!video || !fallback || !source) return;
    video.src = source;
    video.poster = phone.dataset.poster || '';
    const showFallback = () => { video.hidden = true; fallback.hidden = false; };
    const showVideo = () => {
      video.hidden = false;
      fallback.hidden = true;
      video.play().catch(showFallback);
    };
    video.addEventListener('loadeddata', showVideo, { once: true });
    video.addEventListener('error', showFallback, { once: true });
    if ('IntersectionObserver' in window) {
      const videoObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => entry.isIntersecting ? video.play().catch(() => {}) : video.pause());
      }, { rootMargin: '120px' });
      videoObserver.observe(video);
    }
  });

  const services = [
    { kicker:'BASE OPERATIVA', title:'FixyFull', description:'Fulfillment para recibir, almacenar y preparar tus pedidos localmente.', tags:['Stock','Picking','Packing'] },
    { kicker:'VELOCIDAD', title:'Same Day', description:'Entregas en el día para operaciones que necesitan inmediatez dentro del alcance disponible.', tags:['En el día','Última milla','Seguimiento'] },
    { kicker:'PREVISIBILIDAD', title:'Next Day', description:'Entregas en 24 horas para sostener una promesa clara hacia tus clientes.', tags:['24 horas','Distribución','Trazabilidad'] },
    { kicker:'ALCANCE', title:'Envíos al Interior', description:'Distribución hacia diferentes puntos del país desde una operación centralizada.', tags:['Nacional','Domicilio','Sucursal'] },
    { kicker:'FLEXIBILIDAD', title:'FixyPoints', description:'Red Pick Up / Drop Off para sumar alternativas de retiro y devolución.', tags:['Pick Up','Drop Off','Puntos'] },
    { kicker:'COBRO EN LA ENTREGA', title:'FixyPay', description:'Cobro contra entrega mediante QR y efectivo, según disponibilidad del servicio.', tags:['QR','Efectivo','Conciliación'] },
    { kicker:'CIRCUITO COMPLETO', title:'Logística inversa', description:'Gestión de devoluciones para recuperar productos y cerrar la experiencia de compra.', tags:['Devoluciones','Recupero','Seguimiento'] }
  ];
  const serviceButtons = $$('[data-service]');
  const panel = $('#service-panel');
  const selectService = index => {
    const service = services[index];
    if (!service || !panel) return;
    serviceButtons.forEach((button, buttonIndex) => {
      button.setAttribute('aria-selected', String(buttonIndex === index));
      button.tabIndex = buttonIndex === index ? 0 : -1;
    });
    $('.service-number', panel).textContent = `${String(index + 1).padStart(2, '0')} / 07`;
    $('.service-kicker', panel).textContent = service.kicker;
    $('h3', panel).textContent = service.title;
    $('.service-description', panel).textContent = service.description;
    $('.service-tags', panel).innerHTML = service.tags.map(tag => `<span>${tag}</span>`).join('');
    panel.animate?.([{ opacity:.35, transform:'translateY(8px)' }, { opacity:1, transform:'none' }], { duration:260, easing:'ease-out' });
  };
  serviceButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectService(index));
    button.addEventListener('keydown', event => {
      if (!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)) return;
      event.preventDefault();
      const direction = ['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1;
      const next = (index + direction + serviceButtons.length) % serviceButtons.length;
      selectService(next);
      serviceButtons[next].focus();
    });
  });

  const builderModules = $$('.builder-module');
  const activeCount = $('[data-active-count]');
  const updateBuilder = () => {
    if (activeCount) activeCount.textContent = String(builderModules.filter(module => module.classList.contains('is-active')).length);
  };
  builderModules.forEach(module => module.addEventListener('click', () => {
    const isActive = module.classList.toggle('is-active');
    module.setAttribute('aria-pressed', String(isActive));
    updateBuilder();
  }));

  // Configure body[data-form-endpoint] to POST JSON. Until then, the form hands off to official WhatsApp.
  const form = $('#lead-form');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = $('.button--submit', form);
    const errorBox = $('.form-error', form);
    const result = $('.form-result', form);
    const fields = $$('[required]', form);
    fields.forEach(field => field.setAttribute('aria-invalid', String(!field.checkValidity())));
    const firstInvalid = fields.find(field => !field.checkValidity());
    if (firstInvalid) {
      errorBox.hidden = false;
      errorBox.textContent = 'Revisá los campos obligatorios antes de continuar.';
      firstInvalid.focus();
      return;
    }
    errorBox.hidden = true;
    submit.disabled = true;
    submit.firstChild.textContent = 'Enviando… ';
    const payload = Object.fromEntries(new FormData(form).entries());
    const endpoint = document.body.dataset.formEndpoint?.trim();
    try {
      if (endpoint) {
        const response = await fetch(endpoint, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
        if (!response.ok) throw new Error('No se pudo enviar');
        result.innerHTML = '<strong>¡Gracias!</strong><br>Recibimos tu consulta. El equipo de Fixy va a contactarte.';
        form.reset();
      } else {
        const summary = `Hola Fixy, soy ${payload.nombre} de ${payload.empresa} (${payload.pais}). Vendemos / necesitamos: ${payload.necesidad}. Email: ${payload.email}${payload.whatsapp ? `. WhatsApp: ${payload.whatsapp}` : ''}`;
        const whatsappUrl = `https://wa.me/5491125426386?text=${encodeURIComponent(summary)}`;
        result.innerHTML = `<strong>Tu consulta está lista.</strong><br>Completá el envío por WhatsApp para que llegue al equipo comercial. <a href="${whatsappUrl}" target="_blank" rel="noopener">Abrir WhatsApp ↗</a>`;
      }
      result.hidden = false;
    } catch (_) {
      errorBox.hidden = false;
      errorBox.textContent = 'No pudimos enviar la consulta. Probá de nuevo o escribinos a ventas@fixy.com.ar.';
    } finally {
      submit.disabled = false;
      submit.firstChild.textContent = 'Evaluá tu operación en Argentina ';
    }
  });

  $('[data-year]').textContent = new Date().getFullYear();

  if (!reducedMotion && window.matchMedia('(min-width: 900px)').matches) {
    let ticking = false;
    const updateDepth = () => {
      const y = window.scrollY;
      const heroPhone = $('.phone-mockup--hero');
      if (heroPhone && y < window.innerHeight * 1.2) heroPhone.style.translate = `0 ${Math.min(y * .035, 24)}px`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(updateDepth); ticking = true; }
    }, { passive:true });
  }
})();
