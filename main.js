(function () {
  const appConfig = window.APP_CONFIG || {};

  function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFKD')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64)
      .replace(/-+$/g, '');
  }

  function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? '#dc2626' : '#374151';
  }

  function buildPublicUrl(slug) {
    const baseUrl = new URL('business.html', window.location.href);
    baseUrl.searchParams.set('slug', slug);
    return baseUrl.toString();
  }

  function getReservationMessage({ service, date, time, client, businessName }) {
    const lines = [
      'Hola! Quisiera realizar la siguiente reserva:',
      '',
      `Negocio: ${businessName || 'Mi negocio'}`,
      `Servicio: ${service || 'Sin servicio específico'}`,
      `Fecha: ${date || 'Por confirmar'}`,
      `Hora: ${time || 'Por confirmar'}`,
      `Cliente: ${client || 'Cliente'}`
    ];
    return lines.join('\n');
  }

  function ensureSupabaseReady(statusElement = document.getElementById('supabaseStatus')) {
    if (!window.supabase) {
      setStatus(statusElement, 'La librería de Supabase no cargó correctamente.', true);
      return null;
    }

    const supabaseUrl = appConfig.supabaseUrl || '';
    const supabaseKey = appConfig.supabaseAnonKey || '';

    if (!supabaseUrl || !supabaseKey) {
      setStatus(statusElement, 'Configura SUPABASE_URL y SUPABASE_ANON_KEY en tu .env y ejecuta npm run setup:env.', true);
      return null;
    }

    try {
      if (window.SB && !window.supabaseClient) {
        window.SB.init();
      }
    } catch (error) {
      console.error(error);
      setStatus(statusElement, 'Supabase no se inicializó. Revisa la URL y la clave pública.', true);
      return null;
    }

    if (!window.supabaseClient) {
      setStatus(statusElement, 'Supabase no se inicializó. Revisa la URL y la clave pública.', true);
      return null;
    }

    return window.supabaseClient;
  }

  async function ensureLoggedIn(statusElement = document.getElementById('authStatus')) {
    const client = ensureSupabaseReady(document.getElementById('supabaseStatus'));
    if (!client) return null;

    const user = window.SB ? await window.SB.getCurrentUser() : await client.auth.getUser().then((res) => res.data?.user ?? null);
    if (!user) {
      setStatus(statusElement, 'Debes iniciar sesión para guardar o editar negocios.', true);
      return null;
    }

    setStatus(statusElement, `Sesión activa: ${user.email}`);
    return user;
  }

  function updateAuthUI(user = null) {
    const authLoggedOut = document.getElementById('authLoggedOut');
    const authLoggedIn = document.getElementById('authLoggedIn');
    const authUserEmail = document.getElementById('authUserEmail');
    const saveLinkBtn = document.getElementById('saveLinkBtn');

    if (authLoggedOut) authLoggedOut.classList.toggle('hidden', !!user);
    if (authLoggedIn) authLoggedIn.classList.toggle('hidden', !user);
    if (authUserEmail && user) authUserEmail.textContent = user.email || 'usuario';

    if (saveLinkBtn) {
      const isAllowed = !!user;
      saveLinkBtn.disabled = !isAllowed;
      saveLinkBtn.classList.toggle('opacity-50', !isAllowed);
      saveLinkBtn.classList.toggle('cursor-not-allowed', !isAllowed);
      saveLinkBtn.title = isAllowed ? 'Guardar negocio en Supabase' : 'Inicia sesión para guardar';
    }
  }

  async function refreshAuthState() {
    const statusElement = document.getElementById('authStatus');
    const user = window.SB ? await window.SB.getCurrentUser() : null;
    updateAuthUI(user);
    setStatus(statusElement, user ? `Sesión activa: ${user.email}` : 'No has iniciado sesión todavía.');
  }

  async function signUp() {
    const email = document.getElementById('authEmail')?.value.trim();
    const password = document.getElementById('authPassword')?.value.trim();
    const authStatusEl = document.getElementById('authStatus');

    if (!email || !password) {
      setStatus(authStatusEl, 'Escribe email y contraseña para registrarte.', true);
      return;
    }

    try {
      const { data, error } = await window.SB.signUp(email, password);
      if (error) {
        setStatus(authStatusEl, error.message, true);
        return;
      }

      updateAuthUI(data.user || null);
      setStatus(authStatusEl, 'Registro correcto. Revisa tu correo si Supabase lo requiere.');
    } catch (error) {
      console.error(error);
      setStatus(authStatusEl, 'No se pudo registrar el usuario.', true);
    }
  }

  async function signIn() {
    const email = document.getElementById('authEmail')?.value.trim();
    const password = document.getElementById('authPassword')?.value.trim();
    const authStatusEl = document.getElementById('authStatus');

    if (!email || !password) {
      setStatus(authStatusEl, 'Escribe email y contraseña para iniciar sesión.', true);
      return;
    }

    try {
      const { data, error } = await window.SB.signIn(email, password);
      if (error) {
        setStatus(authStatusEl, error.message, true);
        return;
      }

      updateAuthUI(data.user || null);
      setStatus(authStatusEl, `Sesión iniciada como ${data.user?.email ?? 'usuario'}.`);
    } catch (error) {
      console.error(error);
      setStatus(authStatusEl, 'No se pudo iniciar sesión.', true);
    }
  }

  async function signOut() {
    const authStatusEl = document.getElementById('authStatus');

    try {
      const { error } = await window.SB.signOut();
      if (error) {
        setStatus(authStatusEl, error.message, true);
        return;
      }

      updateAuthUI(null);
      setStatus(authStatusEl, 'Sesión cerrada.');
    } catch (error) {
      console.error(error);
      setStatus(authStatusEl, 'No se pudo cerrar la sesión.', true);
    }
  }

  async function testSupabaseConnection() {
    const client = ensureSupabaseReady(document.getElementById('supabaseStatus'));
    if (!client) return;

    try {
      const { data, error } = await client.from('businesses').select('slug_url').limit(1);
      if (error) {
        setStatus(document.getElementById('supabaseStatus'), 'Conectado a Supabase, pero la tabla `businesses` aún no existe o no tiene permisos.', true);
        console.warn('Supabase connection warning:', error.message);
        return;
      }

      setStatus(document.getElementById('supabaseStatus'), 'Conexión con Supabase correcta y lista para guardar links.');
      console.log('Supabase ready:', data);
    } catch (error) {
      console.error(error);
      setStatus(document.getElementById('supabaseStatus'), 'No se pudo conectar a Supabase.', true);
    }
  }

  function generateWhatsAppLink() {
    const phone = document.getElementById('businessPhone')?.value || '';
    const service = document.getElementById('serviceName')?.value || 'Servicio';
    const date = document.getElementById('orderDate')?.value || '';
    const time = document.getElementById('orderTime')?.value || '';
    const client = document.getElementById('clientName')?.value || 'Cliente';
    const businessName = document.getElementById('businessName')?.textContent || 'Mi negocio';
    const preview = document.getElementById('previewMessage');
    const message = getReservationMessage({ service, date, time, client, businessName });

    if (preview) preview.textContent = message;

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      alert('Necesitas poner un número de WhatsApp del negocio.');
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

  function initializeLandingPage() {
    const supabaseStatusEl = document.getElementById('supabaseStatus');
    const authStatusEl = document.getElementById('authStatus');
    const testSupabaseBtn = document.getElementById('testSupabaseBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const generatorName = document.getElementById('generatorName');
    const generatorSlug = document.getElementById('generatorSlug');
    const generateBtn = document.getElementById('generateBtn');
    const generatedLink = document.getElementById('generatedLink');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const saveLinkBtn = document.getElementById('saveLinkBtn');
    const genStatus = document.getElementById('genStatus');

    if (!supabaseStatusEl && !authStatusEl && !generateBtn && !saveLinkBtn) {
      return;
    }

    if (testSupabaseBtn) testSupabaseBtn.addEventListener('click', testSupabaseConnection);
    if (signUpBtn) signUpBtn.addEventListener('click', signUp);
    if (signInBtn) signInBtn.addEventListener('click', signIn);
    if (signOutBtn) signOutBtn.addEventListener('click', signOut);

    generateBtn?.addEventListener('click', () => {
      const name = generatorName?.value.trim() || '';
      const custom = generatorSlug?.value.trim() || '';
      const slug = slugify(custom || name);

      if (!slug) {
        setStatus(genStatus, 'Escribe un nombre o un slug válido.', true);
        return;
      }

      const url = buildPublicUrl(slug);
      if (generatedLink) {
        generatedLink.href = url;
        generatedLink.textContent = url;
      }
      setStatus(genStatus, 'Link generado. Inicia sesión para guardarlo en Supabase.');
    });

    copyLinkBtn?.addEventListener('click', async () => {
      try {
        if (!generatedLink?.href) {
          setStatus(genStatus, 'Primero genera un enlace válido.', true);
          return;
        }
        await navigator.clipboard.writeText(generatedLink.href);
        setStatus(genStatus, 'Enlace copiado al portapapeles.');
      } catch (error) {
        console.error(error);
        setStatus(genStatus, 'No se pudo copiar automáticamente. Copia el enlace manualmente.', true);
      }
    });

    saveLinkBtn?.addEventListener('click', async () => {
      const slug = slugify(generatorSlug?.value.trim() || generatorName?.value.trim() || '');
      const businessName = generatorName?.value.trim() || 'Mi negocio';

      if (!slug) {
        setStatus(genStatus, 'Primero genera un link válido.', true);
        return;
      }

      const user = await ensureLoggedIn(authStatusEl);
      if (!user) return;

      try {
        const { data, error } = await window.SB.saveBusiness({
          slug_url: slug,
          name: businessName,
          whatsapp_phone: document.getElementById('businessPhone')?.value || '',
          owner_id: user.id,
        });

        if (error) throw error;

        setStatus(genStatus, 'Link guardado en Supabase correctamente.');
        console.log('Business saved:', data);
      } catch (error) {
        console.error(error);
        setStatus(genStatus, 'Error guardando en Supabase. Verifica la tabla `businesses`, la sesión y las políticas.', true);
      }
    });

    refreshAuthState();
    window.generateWhatsAppLink = generateWhatsAppLink;
  }

  async function initializeBusinessPage() {
    const form = document.getElementById('businessReservationForm');
    const slug = new URLSearchParams(window.location.search).get('slug');

    if (!form || !slug) {
      return;
    }

    try {
      if (!window.SB) {
        throw new Error('Supabase no está listo.');
      }

      const { data: business, error } = await window.SB.getBusinessBySlug(slug);
      if (error) throw error;
      if (!business) {
        document.getElementById('businessName').textContent = 'Negocio no encontrado';
        document.getElementById('businessMeta').textContent = 'El enlace solicitado no existe o todavía no fue publicado.';
        document.getElementById('reservationStatus').textContent = 'No hay datos disponibles para este negocio.';
        return;
      }

      document.getElementById('businessName').textContent = business.name || 'Mi negocio';
      document.getElementById('businessMeta').textContent = 'Enviar pedido directo al WhatsApp del negocio.';
      document.getElementById('businessPhone').value = business.whatsapp_phone || '';

      const serviceSelect = document.getElementById('serviceName');
      const { data: services, error: servicesError } = await window.SB.getServices(business.id);
      if (servicesError) throw servicesError;

      serviceSelect.innerHTML = '<option value="">Sin servicio específico</option>' + (services || []).map((service) => `<option value="${service.name}">${service.name}</option>`).join('');

      const preview = document.getElementById('previewMessage');
      const customerNameInput = document.getElementById('clientName');
      const orderDateInput = document.getElementById('orderDate');
      const orderTimeInput = document.getElementById('orderTime');
      const reservationStatus = document.getElementById('reservationStatus');

      const updatePreview = () => {
        const payload = {
          service: serviceSelect.value || 'Sin servicio específico',
          date: orderDateInput.value || 'Por confirmar',
          time: orderTimeInput.value || 'Por confirmar',
          client: customerNameInput.value || 'Cliente',
          businessName: business.name || 'Mi negocio'
        };
        preview.textContent = getReservationMessage(payload);
      };

      serviceSelect.addEventListener('change', updatePreview);
      orderDateInput.addEventListener('input', updatePreview);
      orderTimeInput.addEventListener('input', updatePreview);
      customerNameInput.addEventListener('input', updatePreview);
      updatePreview();

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const phone = document.getElementById('businessPhone').value;
        const message = getReservationMessage({
          service: serviceSelect.value || 'Sin servicio específico',
          date: orderDateInput.value || 'Por confirmar',
          time: orderTimeInput.value || 'Por confirmar',
          client: customerNameInput.value || 'Cliente',
          businessName: business.name || 'Mi negocio'
        });

        reservationStatus.textContent = 'Abriendo WhatsApp con tu reserva...';
        if (!phone) {
          reservationStatus.textContent = 'Este negocio no tiene un número de WhatsApp configurado.';
          return;
        }

        const cleanPhone = normalizePhone(phone);
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
      });
    } catch (error) {
      console.error(error);
      const status = document.getElementById('reservationStatus');
      const title = document.getElementById('businessName');
      if (status) status.textContent = 'No se pudo cargar este negocio en este momento.';
      if (title) title.textContent = 'Error al cargar negocio';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initializeLandingPage();
    initializeBusinessPage();
  });
})();
