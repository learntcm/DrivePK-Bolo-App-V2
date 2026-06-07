(() => {
  'use strict';

  const CONFIG = window.DRIVEPK_BOLO_CONFIG || {};
  const $ = (q) => document.querySelector(q);
  const $$ = (q) => Array.from(document.querySelectorAll(q));

  const els = {
    screens: $$('.screen'),
    tabs: $$('.bottom-nav button'),
    homeSearchInput: $('#homeSearchInput'),
    openSearchBtn: $('#openSearchBtn'),
    viewAllBtn: $('#viewAllBtn'),
    featuredStrip: $('#featuredStrip'),
    latestList: $('#latestList'),
    backHomeBtn: $('#backHomeBtn'),
    listingSearchInput: $('#listingSearchInput'),
    voiceSearchBtn: $('#voiceSearchBtn'),
    runSearchBtn: $('#runSearchBtn'),
    searchResultsList: $('#searchResultsList'),
    voiceStatus: $('#voiceStatus'),
    brandInput: $('#brandInput'),
    modelInput: $('#modelInput'),
    cityInput: $('#cityInput'),
    minPriceInput: $('#minPriceInput'),
    maxPriceInput: $('#maxPriceInput'),
    yearInput: $('#yearInput'),

    backFromPostBtn: $('#backFromPostBtn'),
    postVoiceBtn: $('#postVoiceBtn'),
    resetPostBtn: $('#resetPostBtn'),
    postStatus: $('#postStatus'),
    saveLocalPostBtn: $('#saveLocalPostBtn'),
    vehicleMake: $('#vehicleMake'),
    vehicleModel: $('#vehicleModel'),
    vehicleYear: $('#vehicleYear'),
    vehiclePrice: $('#vehiclePrice'),
    vehicleCity: $('#vehicleCity'),
    vehicleColor: $('#vehicleColor'),
    vehicleRegisteredIn: $('#vehicleRegisteredIn'),
    vehicleMileage: $('#vehicleMileage'),
    vehicleExtraInfo: $('#vehicleExtraInfo')
  };

  let mediaRecorder = null;
  let mediaStream = null;
  let audioChunks = [];
  let activeRecordMode = null;

  function showScreen(id) {
    els.screens.forEach((s) => s.classList.toggle('active', s.id === id));
    els.tabs.forEach((t) => t.classList.toggle('active', t.dataset.target === id));
    if (id === 'listingScreen' && !els.searchResultsList.dataset.loaded) {
      searchCars({});
    }
  }

  function money(value) {
    const n = Number(value || 0);
    if (!n) return 'Price on Call';
    if (n >= 100000) {
      const lakh = n / 100000;
      return `${Number.isInteger(lakh) ? lakh : lakh.toFixed(1)} Lakh PKR`;
    }
    return `PKR ${n.toLocaleString('en-PK')}`;
  }

  function getTitle(car) {
    return car.title ||
      [valueText(car.brand), valueText(car.carModel || car.model), car.year].filter(Boolean).join(' ') ||
      'Vehicle';
  }

  function valueText(v) {
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return v.name || v.title || v.businessName || v._id || '';
    return String(v);
  }

  function carImage(car) {
    const img = Array.isArray(car.images) && car.images.length ? car.images[0] : '';
    return img || 'https://dummyimage.com/300x220/1b1f24/ffffff&text=DrivePK';
  }

  function cityOf(car) {
    return car?.location?.city || car?.currentLocation?.city || car.city || '-';
  }

  function cardHtml(car, compact = false) {
    const title = getTitle(car);
    const price = money(car.price);
    const city = cityOf(car);
    const mileage = Number(car.mileage || 0) ? `${Number(car.mileage).toLocaleString('en-PK')} KM drive` : 'Mileage not listed';
    const img = carImage(car);
    const color = car.color ? `Color: ${car.color}` : '';
    const reg = car.registrationState ? `Registered: ${car.registrationState}` : '';
    const badge = car.adType === 'featured' || car.boosterActive ? '<span class="badge">FEATURED PRO</span>' : '';

    if (compact) {
      return `
        <article class="feature-card">
          <img src="${escapeAttr(img)}" alt="${escapeAttr(title)}" loading="lazy" />
          <div class="feature-body">
            ${badge}
            <h3>${escapeHtml(title)}</h3>
            <div class="price">${escapeHtml(price)}</div>
            <div class="meta">${escapeHtml(city)} · ${escapeHtml(mileage)}</div>
          </div>
        </article>
      `;
    }

    return `
      <article class="list-card">
        <img src="${escapeAttr(img)}" alt="${escapeAttr(title)}" loading="lazy" />
        <div class="list-body">
          ${badge}
          <h3>${escapeHtml(title)}</h3>
          <div class="meta">${escapeHtml(city)} · ${escapeHtml(mileage)}</div>
          <div class="meta">${escapeHtml(color)} ${escapeHtml(reg)}</div>
          <div class="price">${escapeHtml(price)}</div>
        </div>
      </article>
    `;
  }

  function escapeHtml(v) {
    return String(v || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  function escapeAttr(v) {
    return escapeHtml(v).replace(/`/g, '&#096;');
  }

  function buildParams(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params.set(key, String(value).trim());
      }
    });

    return params;
  }

  async function fetchCars(filters = {}) {
    const params = buildParams(filters);
    const url = `${CONFIG.CARS_API_URL}${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`DrivePK API error ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
  }

  async function loadHome() {
    try {
      const cars = await fetchCars({ limit: 12 });
      els.featuredStrip.innerHTML = cars.slice(0, 8).map((car) => cardHtml(car, true)).join('') || '<div class="empty-state">No featured cars found.</div>';
      els.latestList.innerHTML = cars.slice(0, 8).map((car) => cardHtml(car)).join('') || '<div class="empty-state">No latest listings found.</div>';
    } catch (error) {
      els.featuredStrip.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
      els.latestList.innerHTML = `<div class="empty-state">Could not load listings.</div>`;
    }
  }

  function filtersFromInputs() {
    const filters = {
      brand: els.brandInput.value,
      model: els.modelInput.value,
      city: els.cityInput.value,
      minPrice: els.minPriceInput.value,
      maxPrice: els.maxPriceInput.value,
      year: els.yearInput.value
    };

    const text = els.listingSearchInput.value.trim();
    if (text) filters.carName = text;

    return filters;
  }

  async function searchCars(filters = null) {
    const finalFilters = filters || filtersFromInputs();
    els.searchResultsList.dataset.loaded = '1';
    els.searchResultsList.innerHTML = '<div class="loading-card">Searching DrivePK cars...</div>';

    try {
      const cars = await fetchCars(finalFilters);
      if (!cars.length) {
        els.searchResultsList.innerHTML = '<div class="empty-state">No matching vehicle found.</div>';
        return;
      }
      els.searchResultsList.innerHTML = cars.map((car) => cardHtml(car)).join('');
    } catch (error) {
      els.searchResultsList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  function simpleTextToFilters(text) {
    const t = String(text || '').toLowerCase();
    const filters = {};

    const brands = ['toyota','honda','suzuki','kia','hyundai','mg','haval','chery','omoda','byd','ford','nissan','daihatsu','changan','proton'];
    const cities = ['lahore','rawalpindi','islamabad','karachi','peshawar','multan','faisalabad','quetta','sialkot','attock','birmingham','london'];
    const brand = brands.find((b) => t.includes(b));
    const city = cities.find((c) => t.includes(c));
    const year = t.match(/\b(19[5-9]\d|20[0-3]\d)\b/);

    if (brand) filters.brand = titleCase(brand);
    if (city) filters.city = titleCase(city);
    if (year) filters.year = year[1];

    const knownModels = ['corolla','yaris','hiace','prado','civic','city','alto','cultus','swift','cortina','fortuner','hilux','sportage','tucson'];
    const model = knownModels.find((m) => t.includes(m) && !(m === 'city' && city));
    if (model) filters.model = titleCase(model);

    const lakhRange = t.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac).*?(?:to|se|say|-).*?(\d+(?:\.\d+)?)\s*(?:lakh|lac)/);
    if (lakhRange) {
      filters.minPrice = Math.round(Number(lakhRange[1]) * 100000);
      filters.maxPrice = Math.round(Number(lakhRange[2]) * 100000);
    }

    return filters;
  }

  function titleCase(v) {
    return String(v || '').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async function startRecording(mode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setModeStatus(mode, 'This browser does not support recording.');
      return;
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }

    activeRecordMode = mode;
    audioChunks = [];

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        mediaStream.getTracks().forEach((track) => track.stop());
        setModeStatus(mode, 'Processing voice...');
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });

        try {
          const result = await uploadAudio(blob, mode);
          if (mode === 'search') handleVoiceSearchResult(result);
          if (mode === 'post') handleVoicePostResult(result);
        } catch (error) {
          setModeStatus(mode, `Voice failed: ${error.message}`);
        } finally {
          mediaRecorder = null;
          audioChunks = [];
          activeRecordMode = null;
        }
      };

      mediaRecorder.start();
      setModeStatus(mode, 'Recording... tap again to stop.');
      setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, Number(CONFIG.MAX_RECORDING_SECONDS || 75) * 1000);
    } catch (error) {
      setModeStatus(mode, 'Microphone permission failed.');
    }
  }

  async function uploadAudio(blob, mode) {
    const form = new FormData();
    form.append('audio', blob, 'drivepk-bolo.webm');
    form.append('task', mode === 'search' ? 'vehicle_search' : 'vehicle_post');

    const response = await fetch(CONFIG.TRANSCRIBE_URL, { method: 'POST', body: form });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      throw new Error(data?.error || `Server error ${response.status}`);
    }

    return data;
  }

  function handleVoiceSearchResult(result) {
    const transcript = result.roman_transcript || result.transcript || result.text || '';
    const aiFilters = result.filters || result.vehicle || {};
    const fallback = simpleTextToFilters(transcript);
    const filters = { ...fallback, ...compactObject(aiFilters) };

    els.listingSearchInput.value = transcript;
    fillSearchInputs(filters);
    els.voiceStatus.textContent = `Transcript: ${transcript}\nSearching...`;
    searchCars(filters);
  }

  function fillSearchInputs(filters) {
    if (filters.brand) els.brandInput.value = valueText(filters.brand);
    if (filters.model || filters.carModel) els.modelInput.value = valueText(filters.model || filters.carModel);
    if (filters.city) els.cityInput.value = valueText(filters.city);
    if (filters.minPrice) els.minPriceInput.value = filters.minPrice;
    if (filters.maxPrice) els.maxPriceInput.value = filters.maxPrice;
    if (filters.year) els.yearInput.value = filters.year;
  }

  function handleVoicePostResult(result) {
    const vehicle = result.vehicle || {};
    const transcript = result.roman_transcript || result.transcript || result.text || '';

    els.vehicleMake.value = valueText(vehicle.make || vehicle.brand);
    els.vehicleModel.value = valueText(vehicle.model || vehicle.carModel);
    els.vehicleYear.value = vehicle.year || '';
    els.vehiclePrice.value = vehicle.price || '';
    els.vehicleCity.value = vehicle.city || '';
    els.vehicleColor.value = vehicle.color || '';
    els.vehicleRegisteredIn.value = vehicle.registeredIn || vehicle.registrationState || '';
    els.vehicleMileage.value = vehicle.mileage || '';
    els.vehicleExtraInfo.value = vehicle.extraInfo || transcript || '';

    els.postStatus.textContent = `Transcript: ${transcript}`;
  }

  function compactObject(obj) {
    const out = {};
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') out[k] = v;
    });
    return out;
  }

  function setModeStatus(mode, text) {
    if (mode === 'search') els.voiceStatus.textContent = text;
    if (mode === 'post') els.postStatus.textContent = text;
  }

  function saveLocalPost() {
    const key = CONFIG.STORAGE_KEYS?.VEHICLES || 'drivepk_bolo_v2_vehicles';
    const old = JSON.parse(localStorage.getItem(key) || '[]');
    old.push({
      title: `${els.vehicleMake.value} ${els.vehicleModel.value} ${els.vehicleYear.value}`.trim(),
      brand: els.vehicleMake.value,
      carModel: els.vehicleModel.value,
      year: els.vehicleYear.value,
      price: Number(els.vehiclePrice.value || 0),
      city: els.vehicleCity.value,
      color: els.vehicleColor.value,
      registrationState: els.vehicleRegisteredIn.value,
      mileage: Number(els.vehicleMileage.value || 0),
      description: els.vehicleExtraInfo.value,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(old));
    els.postStatus.textContent = 'Demo post saved in this browser.';
  }

  function resetPost() {
    ['vehicleMake','vehicleModel','vehicleYear','vehiclePrice','vehicleCity','vehicleColor','vehicleRegisteredIn','vehicleMileage','vehicleExtraInfo']
      .forEach((k) => els[k].value = '');
    els.postStatus.textContent = 'Ready to record';
  }

  function bind() {
    els.tabs.forEach((tab) => tab.addEventListener('click', () => showScreen(tab.dataset.target)));
    els.openSearchBtn.addEventListener('click', () => showScreen('listingScreen'));
    els.viewAllBtn.addEventListener('click', () => showScreen('listingScreen'));
    els.backHomeBtn.addEventListener('click', () => showScreen('homeScreen'));
    els.backFromPostBtn.addEventListener('click', () => showScreen('homeScreen'));

    els.homeSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        els.listingSearchInput.value = els.homeSearchInput.value;
        showScreen('listingScreen');
        searchCars({ carName: els.homeSearchInput.value });
      }
    });

    $$('.category-grid button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const filters = {};
        if (btn.dataset.body) filters.bodyType = btn.dataset.body;
        if (btn.dataset.category) filters.category = btn.dataset.category;
        if (btn.dataset.fuel) filters.fuelType = btn.dataset.fuel;
        showScreen('listingScreen');
        searchCars(filters);
      });
    });

    els.runSearchBtn.addEventListener('click', () => searchCars());
    els.voiceSearchBtn.addEventListener('click', () => startRecording('search'));
    els.postVoiceBtn.addEventListener('click', () => startRecording('post'));
    els.resetPostBtn.addEventListener('click', resetPost);
    els.saveLocalPostBtn.addEventListener('click', saveLocalPost);

    els.listingSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchCars();
    });
  }

  bind();
  loadHome();
})();
