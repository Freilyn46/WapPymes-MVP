document.addEventListener('DOMContentLoaded', () => {
  const supabaseStatusEl = document.getElementById('supabaseStatus');
  const testSupabaseBtn = document.getElementById('testSupabaseBtn');
  const generatorName = document.getElementById('generatorName');
  const generatorSlug = document.getElementById('generatorSlug');
  const generateBtn = document.getElementById('generateBtn');
  const generatedLink = document.getElementById('generatedLink');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const saveLinkBtn = document.getElementById('saveLinkBtn');
  const genStatus = document.getElementById('genStatus');

  function setSupabaseStatus(msg, isError = false) {
    if (!supabaseStatusEl) return;
    supabaseStatusEl.textContent = msg;
    supabaseStatusEl.style.color = isError ? '#dc2626' : '#374151';
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFKD')
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function setGenStatus(msg, isError = false) {
    if (!genStatus) return;
    genStatus.textContent = msg;
    genStatus.style.color = isError ? '#dc2626' : '#374151';
  }

  function buildUrl(slug) {
    return `https://wappymes.com/${encodeURIComponent(slug)}`;
  }

  function ensureSupabaseReady() {
    const supabaseUrl = 'https://wolhwrptaiuzqranmtrc.supabase.co';
    const supabaseKey = 'sb_publishable_y9FmMk1GpClKWSdhmqxqzQ_NgGD23ky';

    if (!window.supabase) {
      setSupabaseStatus('La librería de Supabase no cargó correctamente.', true);
      return null;
    }

    if (!window.supabaseClient) {
      window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    }

    return window.supabaseClient;
  }

  async function testSupabaseConnection() {
    const client = ensureSupabaseReady();
    if (!client) return;

    try {
      const { data, error } = await client.from('businesses').select('slug_url').limit(1);
      if (error) {
        setSupabaseStatus('Conectado a Supabase, pero la tabla `businesses` aún no existe o no tiene permisos.', true);
        console.warn('Supabase connection warning:', error.message);
        return;
      }
      setSupabaseStatus('Conexión con Supabase correcta y lista para guardar links.');
      console.log('Supabase ready:', data);
    } catch (err) {
      console.error(err);
      setSupabaseStatus('No se pudo conectar a Supabase.', true);
    }
  }

  if (testSupabaseBtn) {
    testSupabaseBtn.addEventListener('click', testSupabaseConnection);
  }

  if (generateBtn && generatedLink && generatorName && generatorSlug) {
    generateBtn.addEventListener('click', () => {
      const name = generatorName.value.trim();
      const custom = generatorSlug.value.trim();
      const slug = slugify(custom || name);

      if (!slug) {
        setGenStatus('Escribe un nombre o un slug válido.', true);
        return;
      }

      const url = buildUrl(slug);
      generatedLink.href = url;
      generatedLink.textContent = url;
      setGenStatus('Link generado. Puedes copiarlo o guardarlo en Supabase.');
    });
  }

  if (copyLinkBtn && generatedLink) {
    copyLinkBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(generatedLink.href);
        setGenStatus('Enlace copiado al portapapeles.');
      } catch (error) {
        console.error(error);
        setGenStatus('No se pudo copiar automáticamente. Copia el enlace manualmente.', true);
      }
    });
  }

  if (saveLinkBtn && generatedLink && generatorName) {
    saveLinkBtn.addEventListener('click', async () => {
      const slug = slugify(generatorSlug.value.trim() || generatorName.value.trim());
      const url = generatedLink.href;

      if (!slug || url === '#') {
        setGenStatus('Primero genera un link válido.', true);
        return;
      }

      const client = ensureSupabaseReady();
      if (!client) return;

      try {
        const { error } = await client
          .from('businesses')
          .upsert([
            {
              slug_url: slug,
              name: generatorName.value.trim() || 'Mi negocio',
              whatsapp_phone: document.getElementById('businessPhone')?.value || '',
            }
          ], { onConflict: 'slug_url' });

        if (error) {
          throw error;
        }

        setGenStatus('Link guardado en Supabase correctamente.');
      } catch (error) {
        console.error(error);
        setGenStatus('Error guardando en Supabase. Revisa la tabla `businesses` y las columnas.', true);
      }
    });
  }

  function updatePreview() {
    const phone = document.getElementById('businessPhone')?.value || '';
    const service = document.getElementById('serviceName')?.value || '';
    const date = document.getElementById('orderDate')?.value || '';
    const time = document.getElementById('orderTime')?.value || '';
    const client = document.getElementById('clientName')?.value || '';
    const preview = document.getElementById('previewMessage');

    if (!preview) return;

    const message = `Hola! Quisiera realizar la siguiente reserva:\n\nServicio: ${service}\nFecha: ${date}\nHora: ${time}\nCliente: ${client}`;
    preview.textContent = message;
    return { phone, message };
  }

  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('input', updatePreview);
    const dateInput = document.getElementById('orderDate');
    if (dateInput && !dateInput.value) {
      dateInput.value = '2026-09-18';
    }
    updatePreview();
  }

  window.generateWhatsAppLink = async function () {
    const data = updatePreview();
    const phone = document.getElementById('businessPhone')?.value || '';
    if (!phone) {
      return alert('Necesitas poner un número de WhatsApp del negocio.');
    }

    const client = ensureSupabaseReady();
    const slug = slugify(generatorSlug.value.trim() || generatorName.value.trim() || 'mi-negocio');

    if (client) {
      try {
        await client.from('businesses').upsert([
          {
            slug_url: slug,
            name: generatorName.value.trim() || 'Mi negocio',
            whatsapp_phone: phone,
          }
        ], { onConflict: 'slug_url' });
      } catch (error) {
        console.warn('No se pudo guardar automáticamente en Supabase:', error.message);
      }
    }

    const encodedMessage = encodeURIComponent(data.message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  ensureSupabaseReady();
  setTimeout(() => testSupabaseConnection(), 250);
});
