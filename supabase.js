// Cliente de Supabase para uso en navegador.
(function () {
  const appConfig = window.APP_CONFIG || {};
  const DEFAULT_URL = appConfig.supabaseUrl || '';
  const DEFAULT_ANON_KEY = appConfig.supabaseAnonKey || '';

  function init(url = DEFAULT_URL, key = DEFAULT_ANON_KEY) {
    if (!window.supabase) {
      throw new Error('La librería de Supabase no cargó correctamente.');
    }

    if (!url || !key) {
      throw new Error('Configura SUPABASE_URL y SUPABASE_ANON_KEY en tu .env y ejecuta npm run setup:env');
    }

    window.supabaseClient = window.supabase.createClient(url, key);
    return window.supabaseClient;
  }

  async function signUp(email, password) {
    if (!window.supabaseClient) init();
    return await window.supabaseClient.auth.signUp({ email, password });
  }

  async function signIn(email, password) {
    if (!window.supabaseClient) init();
    return await window.supabaseClient.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    if (!window.supabaseClient) init();
    return await window.supabaseClient.auth.signOut();
  }

  async function saveBusiness({ slug_url, name, whatsapp_phone }) {
    if (!window.supabaseClient) init();
    return await window.supabaseClient
      .from('businesses')
      .upsert([{ slug_url, name, whatsapp_phone }], { onConflict: 'slug_url' })
      .select();
  }

  async function getBusinessBySlug(slug_url) {
    if (!window.supabaseClient) init();
    return await window.supabaseClient
      .from('businesses')
      .select('*')
      .eq('slug_url', slug_url)
      .maybeSingle();
  }

  async function getServices(businessId) {
    if (!window.supabaseClient) init();
    return await window.supabaseClient
      .from('services')
      .select('id, name, description, price, duration_minutes')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('created_at', { ascending: true });
  }

  async function createBooking(booking) {
    if (!window.supabaseClient) init();
    return await window.supabaseClient.from('bookings').insert(booking);
  }

  window.SB = {
    init,
    signUp,
    signIn,
    signOut,
    saveBusiness,
    getBusinessBySlug,
    getServices,
    createBooking
  };
})();