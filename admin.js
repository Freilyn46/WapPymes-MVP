(function () {
  const state = { user: null, business: null };
  const $ = (id) => document.getElementById(id);

  function slugify(value) {
    return String(value || '').normalize('NFKD').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/g, '');
  }

  function cleanPhone(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function showStatus(message, error = false) {
    const element = $('appStatus');
    element.textContent = message;
    element.className = `mb-6 rounded-xl p-3 text-sm ${error ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`;
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleString('es-DO') : 'Sin fecha';
  }

  async function loadBusiness() {
    const { data, error } = await window.supabaseClient.from('businesses')
      .select('*').eq('owner_id', state.user.id).maybeSingle();
    if (error) throw error;
    state.business = data;
    if (!data) return;
    $('businessName').value = data.name || '';
    $('businessSlug').value = data.slug_url || '';
    $('businessPhone').value = data.whatsapp_phone || '';
    $('businessDescription').value = data.business_description || '';
    $('publicLink').innerHTML = `Página pública: <a class="font-semibold text-emerald-700 hover:underline" href="business.html?slug=${encodeURIComponent(data.slug_url)}" target="_blank">business.html?slug=${data.slug_url}</a>`;
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
    if (error) return showStatus(error.message, true);
    await loadServices();
  }

  async function updateBookingStatus(id, status) {
    const { error } = await window.supabaseClient.from('bookings').update({ status }).eq('id', id);
    if (error) showStatus(error.message, true);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  async function bootPanel() {
    try {
      window.SB.init();
      const { data: { user }, error } = await window.SB.getUser();
      if (error) throw error;
      if (!user) return;
      state.user = user;
      $('authView').classList.add('hidden');
      $('panelView').classList.remove('hidden');
      $('userEmail').textContent = user.email;
      await loadBusiness();
    } catch (error) {
      showStatus(error.message || 'No se pudo cargar el panel.', true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    let signUpMode = false;
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
        if (signUpMode) showStatus('Cuenta creada. Revisa tu correo si Supabase solicita confirmación.');
        await bootPanel();
      } catch (error) {
        showStatus(error.message, true);
      }
    });
    $('signOut').addEventListener('click', async () => { await window.SB.signOut(); window.location.reload(); });
    $('businessForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const slug = slugify($('businessSlug').value || $('businessName').value);
        const payload = { owner_id: state.user.id, slug_url: slug, name: $('businessName').value.trim(), whatsapp_phone: cleanPhone($('businessPhone').value), business_description: $('businessDescription').value.trim() };
        const { data, error } = await window.supabaseClient.from('businesses').upsert(payload, { onConflict: 'slug_url' }).select().single();
        if (error) throw error;
        state.business = data;
        await loadBusiness();
        showStatus('Datos del negocio guardados.');
      } catch (error) { showStatus(error.message, true); }
    });
    $('serviceForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.business) return showStatus('Primero guarda los datos del negocio.', true);
      const { error } = await window.supabaseClient.from('services').insert({ business_id: state.business.id, name: $('serviceName').value.trim(), description: $('serviceDescription').value.trim() || null, price: $('servicePrice').value || null, duration_minutes: $('serviceDuration').value || null });
      if (error) return showStatus(error.message, true);
      event.target.reset();
      await loadServices();
      showStatus('Servicio agregado.');
    });
    $('refreshBookings').addEventListener('click', loadBookings);
    bootPanel();
  });
})();
