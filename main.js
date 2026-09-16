(function () {
  const appConfig = window.APP_CONFIG || {};

  function normalizePhone(phone) {
    const raw = String(phone || '').replace(/\D/g, '');
    return raw;
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

  function buildUrl(slug) {
    const baseUrl = new URL('business.html', window.location.href);
    baseUrl.searchParams.set('slug', slug);
    return baseUrl.toString();
  }

  function setStatus(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? '#dc2626' : '#374151';
  }

  function ensureSupabaseReady(statusElement) {
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

    if (!window.supabaseClient) {
      window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    }

    return window.supabaseClient;
  }

  async function testSupabaseConnection() {
    const supabaseStatusEl = document.getElementById('supabaseStatus');
    const client = ensureSupabaseReady(supabaseStatusEl);
    if (!client) return;

    try {
      const { data, error } = await client.from('businesses').select('slug_url').limit(1);
      if (error) {
        setStatus(supabaseStatusEl, 'Conectado a Supabase, pero la tabla `businesses` aún no existe o no tiene permisos.', true);
        console.warn('Supabase connection warning:', error.message);
        return;
      }

      setStatus(supabaseStatusEl, 'Conexión con Supabase correcta y lista para guardar links.');
      console.log('Supabase ready:', data);
    } catch (error) {
      console.error(error);
      setStatus(supabaseStatusEl, 'No se pudo conectar a Supabase.', true);
    }
  }

  function saveBusinessRecord(slug, name, phone) {
    const client = ensureSupabaseReady(document.getElementById('genStatus'));
    if (!client || !slug) return;

    return client
      .from('businesses')
      .upsert([
        {
          slug_url: slug,
          name: name || 'Mi negocio',
          whatsapp_phone: normalizePhone(phone)
        }
      ], { onConflict: 'slug_url' });
  }

  function getReservationMessage({ service, date, time, client }) {
    return `Hola! Quisiera realizar la siguiente reserva:\n\nServicio: ${service}\nFecha: ${date}\nHora: ${time}\nCliente: ${client}`;
  }

  function updatePreview() {
    const phone = document.getElementById('businessPhone')?.value || '';
    const service = document.getElementById('serviceName')?.value || '';
    const date = document.getElementById('orderDate')?.value || '';
    const time = document.getElementById('orderTime')?.value || '';
    const client = document.getElementById('clientName')?.value || '';
    const preview = document.getElementById('previewMessage');

    if (!preview) return { phone, message: '' };

    const message = getReservationMessage({ service, date, time, client });
    preview.textContent = message;
    return { phone, message };
  }

  function openWhatsAppLink(phone, message) {
    const cleanedPhone = normalizePhone(phone);
    if (!cleanedPhone) {
      alert('Necesitas poner un número de WhatsApp del negocio.');
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }

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

    if (testSupabaseBtn) {
      testSupabaseBtn.addEventListener('click', testSupabaseConnection);
    }

    if (generateBtn && generatedLink && generatorName && generatorSlug) {
      generateBtn.addEventListener('click', () => {
        const name = generatorName.value.trim();
        const custom = generatorSlug.value.trim();
        const slug = slugify(custom || name);

        if (!slug) {
          setStatus(genStatus, 'Escribe un nombre o un slug válido.', true);
          return;
        }

        const url = buildUrl(slug);
        generatedLink.href = url;
        generatedLink.textContent = url;
        setStatus(genStatus, 'Link generado. Puedes copiarlo o guardarlo en Supabase.');
      });
    }

    if (copyLinkBtn && generatedLink) {
      copyLinkBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(generatedLink.href);
          setStatus(genStatus, 'Enlace copiado al portapapeles.');
        } catch (error) {
          console.error(error);
          setStatus(genStatus, 'No se pudo copiar automáticamente. Copia el enlace manualmente.', true);
        }
      });
    }

    if (saveLinkBtn && generatorName && generatorSlug) {
      saveLinkBtn.addEventListener('click', async () => {
        const slug = slugify(generatorSlug.value.trim() || generatorName.value.trim());
        const businessName = generatorName.value.trim() || 'Mi negocio';

        if (!slug) {
          setStatus(genStatus, 'Primero genera un link válido.', true);
          return;
        }

        try {
          const client = ensureSupabaseReady(genStatus);
          if (!client) return;
          const { error } = await client
            .from('businesses')
            .upsert([
              {
                slug_url: slug,
                name: businessName,
                whatsapp_phone: normalizePhone(document.getElementById('businessPhone')?.value || '')
              }
            ], { onConflict: 'slug_url' });

          if (error) {
            throw error;
          }

          setStatus(genStatus, 'Link guardado en Supabase correctamente.');
        } catch (error) {
          console.error(error);
          setStatus(genStatus, 'Error guardando en Supabase. Revisa la tabla `businesses` y las columnas.', true);
        }
      });
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

    const businessReservationForm = document.getElementById('businessReservationForm');
    if (businessReservationForm) {
      const businessPhone = document.getElementById('businessPhone');
      const serviceName = document.getElementById('serviceName');
      const orderDate = document.getElementById('orderDate');
      const orderTime = document.getElementById('orderTime');
      const clientName = document.getElementById('clientName');
      const clientPhone = document.getElementById('clientPhone');
      const businessNameEl = document.getElementById('businessName');
      const businessMetaEl = document.getElementById('businessMeta');
      const reservationStatusEl = document.getElementById('reservationStatus');
      let businessData = null;

      const slug = new URLSearchParams(window.location.search).get('slug');
      const normalizedSlug = slugify(slug || '');

      const loadBusiness = async () => {
        if (!normalizedSlug) {
          if (businessNameEl) businessNameEl.textContent = 'Negocio no encontrado';
          if (businessMetaEl) businessMetaEl.textContent = 'No se indicó un slug válido.';
          return;
        }

        const client = ensureSupabaseReady(businessMetaEl);
        if (!client) return;

        try {
          const { data, error } = await window.SB.getBusinessBySlug(normalizedSlug);

          if (error) throw error;

          if (!data) {
            if (businessNameEl) businessNameEl.textContent = 'Negocio no encontrado';
            if (businessMetaEl) businessMetaEl.textContent = 'El enlace no existe o aún no se ha registrado.';
            return;
          }

          businessData = data;
          if (businessNameEl) businessNameEl.textContent = data.name || 'Mi negocio';
          if (businessMetaEl) businessMetaEl.textContent = 'Haz tu reserva y envíala directamente por WhatsApp.';
          if (businessPhone) businessPhone.value = data.whatsapp_phone || '';

          const servicesResult = await window.SB.getServices(data.id);
          if (servicesResult.error) throw servicesResult.error;
          if (serviceName) {
            serviceName.replaceChildren();
            const services = servicesResult.data || [];
            if (!services.length) {
              const option = document.createElement('option');
              option.value = '';
              option.textContent = 'Sin servicio específico';
              serviceName.append(option);
            }
            services.forEach((service) => {
              const option = document.createElement('option');
              option.value = service.id;
              option.dataset.name = service.name;
              option.textContent = service.price == null
                ? service.name
                : `${service.name} (RD$ ${Number(service.price).toLocaleString('es-DO')})`;
              serviceName.append(option);
            });
          }
          updatePreview();
        } catch (error) {
          console.error(error);
          if (businessNameEl) businessNameEl.textContent = 'Error al cargar el negocio';
          if (businessMetaEl) businessMetaEl.textContent = 'No se pudo consultar la información del negocio.';
        }
      };

      if (serviceName && orderDate && orderTime && clientName) {
        serviceName.addEventListener('input', updatePreview);
        orderDate.addEventListener('input', updatePreview);
        orderTime.addEventListener('input', updatePreview);
        clientName.addEventListener('input', updatePreview);
      }

      businessReservationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!businessData) {
          setStatus(reservationStatusEl, 'No se puede enviar la reserva porque el negocio no está disponible.', true);
          return;
        }

        const selectedService = serviceName?.selectedOptions?.[0];
        const serviceId = selectedService?.value || null;
        const service = selectedService?.dataset.name || selectedService?.textContent || '';
        const booking = {
          business_id: businessData.id,
          service_id: serviceId,
          customer_name: clientName?.value.trim() || '',
          customer_phone: normalizePhone(clientPhone?.value || '') || null,
          requested_date: orderDate?.value || null,
          requested_time: orderTime?.value || null,
          detail: null,
          status: 'pending'
        };
        const message = getReservationMessage({
          service,
          date: orderDate?.value || '',
          time: orderTime?.value || '',
          client: booking.customer_name
        });

        setStatus(reservationStatusEl, 'Guardando reserva…');
        let bookingSaved = true;
        try {
          const { error } = await window.SB.createBooking(booking);
          if (error) throw error;
        } catch (error) {
          console.error(error);
          bookingSaved = false;
          setStatus(reservationStatusEl, 'No se pudo guardar la reserva, pero puedes enviarla por WhatsApp.', true);
        } finally {
          openWhatsAppLink(businessPhone?.value || '', message);
          if (bookingSaved) {
            setStatus(reservationStatusEl, 'Reserva preparada. Confirma el envío en WhatsApp.');
          }
        }
      });

      if (!orderDate?.value) {
        orderDate.value = '2026-09-18';
      }
      updatePreview();
      loadBusiness();
    }

    window.generateWhatsAppLink = function () {
      const data = updatePreview();
      const phone = document.getElementById('businessPhone')?.value || '';
      if (!phone) {
        return alert('Necesitas poner un número de WhatsApp del negocio.');
      }

      const slug = slugify(generatorSlug?.value.trim() || generatorName?.value.trim() || 'mi-negocio');
      const client = ensureSupabaseReady(genStatus);

      if (client && slug) {
        client
          .from('businesses')
          .upsert([
            {
              slug_url: slug,
              name: generatorName?.value.trim() || 'Mi negocio',
              whatsapp_phone: normalizePhone(phone)
            }
          ], { onConflict: 'slug_url' })
          .catch((error) => console.warn('No se pudo guardar automáticamente en Supabase:', error.message));
      }

      openWhatsAppLink(phone, data.message);
    };

    if (!window.location.pathname.endsWith('business.html')) {
      setTimeout(() => testSupabaseConnection(), 250);
    }
  });
})();
