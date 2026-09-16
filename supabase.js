// Cliente de Supabase para uso en navegador.
(function () {
  const DEFAULT_URL = 'https://wolhwrptaiuzqranmtrc.supabase.co';
  const DEFAULT_ANON_KEY = 'sb_publishable_y9FmMk1GpClKWSdhmqxqzQ_NgGD23ky';

  function init(url = DEFAULT_URL, key = DEFAULT_ANON_KEY) {
    if (!window.supabase) {
      throw new Error('La librería de Supabase no cargó correctamente.');
    }

    if (!url || !key) {
      throw new Error('Supabase URL y ANON KEY requeridos');
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

  window.SB = { init, signUp, signIn, signOut, saveBusiness, getBusinessBySlug };
})();