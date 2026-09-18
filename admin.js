(function () {
  const state = { user: null, business: null };
  const $ = (id) => document.getElementById(id);
  const REMEMBERED_EMAIL_KEY = 'wappymes.rememberedEmail';

  function slugify(value) {
    return String(value || '').normalize('NFKD').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/g, '');
  }

  function cleanPhone(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function normalizeWhatsAppPhone(value) {
    const phone = cleanPhone(value);
    if (/^(809|829|849)\d{7}$/.test(phone)) return `1${phone}`;
    return phone;
  }

  function showStatus(message, error = false) {
    const element = $('appStatus');
    if (!element) return;

    if (error) {
      element.textContent = message || 'Ocurrió un error. Inténtalo de nuevo.';
      element.className = 'mb-6 rounded-xl bg-red-100 p-3 text-sm text-red-800';
      return;
    }

    element.textContent = message;
    element.classList.remove('hidden');
    element.className = 'mb-6 rounded-xl p-3 text-sm bg-emerald-100 text-emerald-700';
  }

  function authMessage(error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
    if (message.includes('email not confirmed')) return 'Confirma tu correo desde el mensaje enviado por Supabase y vuelve a intentarlo.';
    if (message.includes('too many requests')) return 'Se alcanzó el límite temporal de intentos. Espera unos minutos y vuelve a intentarlo.';
    if (message.includes('user already registered')) return 'Este correo ya tiene una cuenta. Inicia sesión en lugar de registrarte.';
    return 'No se pudo completar la operación. Revisa la configuración y tus datos.';
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleString('es-DO') : 'Sin fecha';
  }

  async function loadBusiness() {
    const { data: businesses, error } = await window.supabaseClient.from('businesses')
      .select('id, owner_id, slug_url, name, whatsapp_phone, business_description, created_at')
      .eq('owner_id', state.user.id)
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) throw error;
    const data = businesses?.[0] || null;
    state.business = data;
    if (!data) {
      $('publicLink').textContent = 'Guarda los datos del negocio para publicar tu página.';
      $('servicesList').innerHTML = '<p class="text-sm text-slate-500">Guarda primero el negocio para agregar servicios.</p>';
      $('bookingsList').innerHTML = '<p class="text-sm text-slate-500">Las reservas aparecerán aquí después de publicar el negocio.</p>';
      return;
    }
    $('businessName').value = data.name || '';
    $('businessSlug').value = data.slug_url || '';
    $('businessPhone').value = data.whatsapp_phone || '';
    $('businessDescription').value = data.business_description || '';
    const publicUrl = new URL(`business.html?slug=${encodeURIComponent(data.slug_url)}`, window.location.href).toString();
    $('publicLink').innerHTML = `Página pública: <a class="font-semibold text-emerald-700 hover:underline" href="${publicUrl}" target="_blank" rel="noopener">${publicUrl}</a>`;
    await Promise.all([loadServices(), loadBookings()]);
  }

  async function loadServices() {
    if (!state.business) return;
    const { data, error } = await window.supabaseClient.from('services')
      .select('*').eq('business_id', state.business.id).order('created_at');
    if (error) throw error;
    $('servicesList').innerHTML = data.length ? data.map((service) => `
      <article class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
        <div><strong>${escapeHtml(service.name)}</strong><p class="text-xs text-slate-500">${escapeHtml(service.description || '')}</p></div>
        <button data-delete-service="${service.id}" class="text-sm font-semibold text-red-600">Eliminar</button>
      </article>`).join('') : '<p class="text-sm text-slate-500">Aún no tienes servicios.</p>';
    document.querySelectorAll('[data-delete-service]').forEach((button) => {
      button.addEventListener('click', () => deleteService(button.dataset.deleteService));
    });
  }

  async function loadBookings() {
    if (!state.business) return;
    const { data, error } = await window.supabaseClient.from('bookings')
      .select('id, customer_name, customer_phone, requested_date, requested_time, detail, status, created_at, services(name)')
      .eq('business_id', state.business.id).order('created_at', { ascending: false });
    if (error) throw error;
    $('bookingsList').innerHTML = data.length ? `<table class="w-full min-w-[720px] text-left text-sm"><thead><tr class="border-b text-slate-500"><th class="p-3">Cliente</th><th class="p-3">Servicio</th><th class="p-3">Fecha</th><th class="p-3">Estado</th><th class="p-3">Recibida</th></tr></thead><tbody>${data.map((booking) => `
      <tr class="border-b last:border-0"><td class="p-3"><strong>${escapeHtml(booking.customer_name)}</strong><br><span class="text-xs text-slate-500">${escapeHtml(booking.customer_phone || '')}</span></td><td class="p-3">${escapeHtml(booking.services?.name || 'Sin servicio')}</td><td class="p-3">${booking.requested_date || '—'} ${booking.requested_time || ''}</td><td class="p-3"><select data-booking-status="${booking.id}" class="rounded-lg border border-slate-300 px-2 py-1"><option ${booking.status === 'pending' ? 'selected' : ''} value="pending">Pendiente</option><option ${booking.status === 'confirmed' ? 'selected' : ''} value="confirmed">Confirmada</option><option ${booking.status === 'cancelled' ? 'selected' : ''} value="cancelled">Cancelada</option></select></td><td class="p-3 text-xs text-slate-500">${formatDate(booking.created_at)}</td></tr>`).join('')}</tbody></table>` : '<p class="text-sm text-slate-500">No hay reservas todavía.</p>';
    document.querySelectorAll('[data-booking-status]').forEach((select) => {
      select.addEventListener('change', () => updateBookingStatus(select.dataset.bookingStatus, select.value));
    });
  }

  async function deleteService(id) {
    if (!confirm('¿Eliminar este servicio?')) return;
    const { error } = await window.supabaseClient.from('services').delete().eq('id', id);
    if (error) {
      console.error(error);
      return showStatus('No se pudo eliminar el servicio. Inténtalo de nuevo.', true);
    }
    await loadServices();
  }

  async function updateBookingStatus(id, status) {
    const { error } = await window.supabaseClient.from('bookings').update({ status }).eq('id', id);
    if (error) {
      console.error(error);
      showStatus('No se pudo actualizar la reserva. Inténtalo de nuevo.', true);
    }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  async function bootPanel() {
    try {
      window.SB.init();
      const { data: { user }, error } = await window.SB.getUser();
      if (error && error.message !== 'Auth session missing!') throw error;
      if (!user) {
        $('authView').classList.remove('hidden');
        $('panelView').classList.add('hidden');
        return;
      }
      state.user = user;
      $('authView').classList.add('hidden');
      $('panelView').classList.remove('hidden');
      $('userEmail').textContent = user.email;
      await loadBusiness();
      showStatus(state.business ? 'Sesión restaurada. Tu panel está listo.' : 'Sesión restaurada. Completa los datos de tu negocio para comenzar.');
    } catch (error) {
      console.error(error);
      showStatus('El panel estará disponible en breve. Inténtalo de nuevo más tarde.', true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    let signUpMode = false;
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      $('authEmail').value = rememberedEmail;
      $('rememberEmail').checked = true;
    }
    $('authToggle').addEventListener('click', () => {
      signUpMode = !signUpMode;
      $('authTitle').textContent = signUpMode ? 'Crear cuenta' : 'Iniciar sesión';
      $('authSubmit').textContent = signUpMode ? 'Crear cuenta' : 'Iniciar sesión';
      $('authToggle').textContent = signUpMode ? '¿Ya tienes cuenta? Iniciar sesión' : '¿No tienes cuenta? Crear una';
    });
    $('authForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const result = signUpMode
          ? await window.SB.signUp($('authEmail').value, $('authPassword').value)
          : await window.SB.signIn($('authEmail').value, $('authPassword').value);
        if (result.error) throw result.error;
        if ($('rememberEmail').checked) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, $('authEmail').value.trim());
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
        if (!signUpMode && !result.data?.session) {
          showStatus('La sesión no se pudo iniciar. Confirma tu correo si Supabase lo solicita.', true);
          return;
        }
        if (signUpMode && !result.data?.session) {
          showStatus('Cuenta creada. Confirma tu correo desde el mensaje de Supabase y luego inicia sesión.');
          return;
        }
        await bootPanel();
      } catch (error) {
        console.error(error);
        showStatus(authMessage(error), true);
      }
    });
    $('signOut').addEventListener('click', async () => { await window.SB.signOut(); window.location.reload(); });
    $('businessForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const slug = slugify($('businessSlug').value || $('businessName').value);
        const name = $('businessName').value.trim();
        const whatsappPhone = normalizeWhatsAppPhone($('businessPhone').value);
        if (!slug || !name || !/^1\d{10}$/.test(whatsappPhone)) {
          showStatus('Completa el nombre, un slug válido y un WhatsApp de 10 dígitos con código de país.', true);
          return;
        }
        const payload = { owner_id: state.user.id, slug_url: slug, name, whatsapp_phone: whatsappPhone, business_description: $('businessDescription').value.trim() || null };
        const { data: savedBusinesses, error } = await window.supabaseClient.from('businesses').upsert(payload, { onConflict: 'slug_url' }).select();
        if (error) throw error;
        const data = savedBusinesses?.[0];
        if (!data) throw new Error('Supabase no devolvió el negocio guardado.');
        state.business = data;
        await loadBusiness();
        showStatus('Datos del negocio guardados.');
      } catch (error) { showStatus('No se pudieron guardar los datos del negocio. Revisa la conexión y los permisos.', true); console.error(error); }
    });
    $('serviceForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.business) return showStatus('Primero guarda los datos del negocio.', true);
      const name = $('serviceName').value.trim();
      const duration = $('serviceDuration').value ? Number($('serviceDuration').value) : null;
      const price = $('servicePrice').value ? Number($('servicePrice').value) : null;
      if (!name || (duration !== null && (!Number.isInteger(duration) || duration < 1)) || (price !== null && price < 0)) {
        return showStatus('Revisa el nombre, precio y duración del servicio.', true);
      }
      const { error } = await window.supabaseClient.from('services').insert({ business_id: state.business.id, name, description: $('serviceDescription').value.trim() || null, price, duration_minutes: duration });
      if (error) return showStatus('No se pudo agregar el servicio. Revisa la conexión y los permisos.', true);
      event.target.reset();
      await loadServices();
      showStatus('Servicio agregado.');
    });
    $('refreshBookings').addEventListener('click', () => {
      loadBookings().catch((error) => {
        console.error(error);
        showStatus('No se pudieron actualizar las reservas.', true);
      });
    });
    bootPanel();
  });
})();
