/* AUREN live data integration. Public key only; all permissions are enforced by Supabase RLS. */
(() => {
  'use strict';
  const URL = 'https://upcgbbwwghaazsqfbwri.supabase.co';
  const KEY = 'sb_publishable_SrxxuVdqu0TqBEhkfxIO1Q_Xdi834aQ';
  const db = window.supabase.createClient(URL, KEY);
  const $ = (id) => document.getElementById(id);
  let session = null;
  function notify(message) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(window.__aurenToastTimer);
    window.__aurenToastTimer = setTimeout(() => { el.style.display = 'none'; }, 4500);
  }

  // Never show hard-coded example properties as if they were real listings.
  listings = [];
  demoListings.length = 0;
  render();

  async function refreshListings() {
    const { data, error } = await db.from('properties')
      .select('id,title,description,property_type,listing_type,price,city,surface_sqm,bedrooms,image_url')
      .eq('status', 'published').order('created_at', { ascending: false });
    if (error) {
      console.error('AUREN listings:', error.message);
      listings = [];
      render();
      notify('Non è stato possibile caricare gli annunci. Riprova più tardi.');
      return;
    }
    listings = (data || []).map(p => ({
      id: p.id,
      title: p.title,
      location: p.city || '',
      price: Number(p.price || 0),
      purpose: p.listing_type || 'sale',
      type: p.property_type || 'Immobile',
      area: p.surface_sqm,
      beds: p.bedrooms,
      source: 'agency',
      image: p.image_url || '',
      description: p.description || ''
    }));
    render();
  }
  awaitSession();
  function awaitSession() {
    db.auth.getSession().then(({ data, error }) => {
      if (error) console.warn('AUREN session:', error.message);
      session = data?.session || null;
      updateAccountLink();
    });
  }
  db.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    updateAccountLink();
  });
  function updateAccountLink() {
    const link = $('accountLink');
    if (link) link.textContent = session ? 'Account' : 'Accedi';
  }

  // Real listing submission: requires a signed-in user and creates a pending listing.
  $('listingForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!session) {
      notify('Accedi o crea un account AUREN per inviare un annuncio.');
      window.location.href = 'account.html';
      return;
    }
    const form = $('listingForm');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const { error } = await db.from('properties').insert({
        owner_id: session.user.id,
        title: $('newTitle').value.trim(),
        description: '',
        property_type: $('newType').value,
        listing_type: $('newPurpose').value,
        price: Number($('newPrice').value),
        city: $('newLocation').value.trim(),
        surface_sqm: $('newArea').value ? Number($('newArea').value) : null,
        bedrooms: $('newBeds').value ? Number($('newBeds').value) : null,
        status: 'pending',
        image_url: $('newImage').value.trim() || null
      });
      if (error) throw error;
      form.reset();
      $('listingModal')?.classList.remove('open');
      document.body.style.overflow = '';
      notify('Annuncio inviato per la verifica AUREN. Sarà pubblicato dopo l’approvazione.');
    } catch (error) {
      console.error('AUREN listing submit:', error.message);
      notify('Invio non riuscito. Verifica l’accesso e riprova.');
    } finally {
      button.disabled = false;
    }
  }, true);

  // Service requests are stored in the private service_requests table.
  $('serviceForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const email = $('serviceEmail').value.trim();
    const phone = $('servicePhone').value.trim();
    if (!email && !phone) {
      notify('Inserisci almeno email oppure numero di telefono.');
      return;
    }
    const form = $('serviceForm');
    const button = $('submitService');
    button.disabled = true;
    try {
      const service = $('selectedService').value;
      const price = Number($('selectedPrice').value || 0);
      const action = $('selectedAction').value;
      const details = $('serviceDetails').value.trim();
      const name = $('serviceName').value.trim();
      const { error } = await db.from('service_requests').insert({
        user_id: session?.user?.id || null,
        service_id: null,
        contact_email: email || null,
        contact_phone: phone || null,
        notes: [
          name ? 'Nome: ' + name : '',
          'Servizio: ' + service,
          'Prezzo indicativo mostrato: €' + price,
          'Richiesta: ' + action,
          details ? 'Dettagli: ' + details : ''
        ].filter(Boolean).join('\n'),
        status: 'pending'
      });
      if (error) throw error;
      form.reset();
      $('serviceModal')?.classList.remove('open');
      document.body.style.overflow = '';
      notify('Richiesta inviata. Ti ricontatteremo al recapito indicato.');
    } catch (error) {
      console.error('AUREN service request:', error.message);
      notify('Non è stato possibile inviare la richiesta. Riprova tra poco.');
    } finally {
      button.disabled = false;
    }
  }, true);

  // Newsletter addresses can only be inserted; clients cannot read the list.
  $('newsletterForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const email = $('newsletterEmail').value.trim().toLowerCase();
    const button = $('newsletterForm').querySelector('button');
    button.disabled = true;
    try {
      const { error } = await db.from('newsletter_subscribers').insert({ email });
      if (error && !String(error.message).toLowerCase().includes('duplicate')) throw error;
      $('newsletterForm').reset();
      notify('Grazie: iscrizione alla newsletter AUREN registrata.');
    } catch (error) {
      console.error('AUREN newsletter:', error.message);
      notify('Iscrizione non riuscita. Se eri già iscritto, sei già nella lista.');
    } finally {
      button.disabled = false;
    }
  }, true);

  async function refreshServicePrices() {
    const {data, error} = await db.from('services').select('name,price,active').eq('active', true);
    if (error) { console.warn('AUREN service catalog:', error.message); return; }
    const services = data || [];
    document.querySelectorAll('.service-order').forEach(button => {
      const name = button.dataset.service;
      const service = services.find(item => item.name.toLowerCase() === String(name).toLowerCase());
      if (!service) return;
      button.dataset.price = String(service.price);
      const article = button.closest('.service-card');
      if (article) {
        const priceEl = article.querySelector('.service-price');
        if (priceEl) priceEl.innerHTML = '€ ' + Number(service.price).toLocaleString('it-IT') + ' <small>/ da</small>';
      }
    });
  }

  refreshListings();
  refreshServicePrices();
})();