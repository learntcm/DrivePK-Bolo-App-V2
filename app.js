(() => {
  'use strict';

  const CONFIG = window.DRIVEPK_BOLO_CONFIG || {};
  const EXPIRY_MS = Number(CONFIG.EXPIRY_MINUTES || 10) * 60 * 1000;
  const MAX_RECORDING_SECONDS = Number(CONFIG.MAX_RECORDING_SECONDS || 75);

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    navButtons: $$('.nav-btn'),
    lockNotice: $('#lockNotice'),
    appStatus: $('#appStatus'),
    goPostBtn: $('#goPostBtn'),
    goProfileBtn: $('#goProfileBtn'),
    totalVehicles: $('#totalVehicles'),
    activeVehicles: $('#activeVehicles'),
    dueVehicles: $('#dueVehicles'),
    duePanel: $('#duePanel'),
    dueList: $('#dueList'),
    recentVehicles: $('#recentVehicles'),
    clearSoldBtn: $('#clearSoldBtn'),

    profileForm: $('#profileForm'),
    profileName: $('#profileName'),
    profilePhone: $('#profilePhone'),
    profileWhatsapp: $('#profileWhatsapp'),
    profileCity: $('#profileCity'),
    profileEmail: $('#profileEmail'),
    profileSaveStatus: $('#profileSaveStatus'),
    clearProfileBtn: $('#clearProfileBtn'),

    playGuideBtn: $('#playGuideBtn'),
    recorderCard: $('#recorderCard'),
    recordBtn: $('#recordBtn'),
    resetPostBtn: $('#resetPostBtn'),
    recordingStatus: $('#recordingStatus'),
    recordingHelp: $('#recordingHelp'),
    recordTimer: $('#recordTimer'),
    transcriptBox: $('#transcriptBox'),
    transcriptText: $('#transcriptText'),

    vehicleForm: $('#vehicleForm'),
    vehicleMake: $('#vehicleMake'),
    vehicleModel: $('#vehicleModel'),
    vehicleYear: $('#vehicleYear'),
    vehiclePrice: $('#vehiclePrice'),
    vehicleCity: $('#vehicleCity'),
    vehicleColor: $('#vehicleColor'),
    vehicleRegisteredIn: $('#vehicleRegisteredIn'),
    vehicleMileage: $('#vehicleMileage'),
    vehicleExtraInfo: $('#vehicleExtraInfo'),
    submitVehicleBtn: $('#submitVehicleBtn'),
    postStatus: $('#postStatus'),

    searchInput: $('#searchInput'),
    searchBtn: $('#searchBtn'),
    searchResults: $('#searchResults')
  };

  let mediaRecorder = null;
  let mediaStream = null;
  let audioChunks = [];
  let recordingStartedAt = 0;
  let recordingTimerId = null;
  let maxRecordingTimerId = null;
  let activeGuideAudio = null;

  const makeModels = {
    Toyota: ['Corolla', 'Yaris', 'Aqua', 'Prius', 'Vitz', 'Passo', 'Fortuner', 'Hilux', 'Revo', 'Prado', 'Land Cruiser', 'Grande', 'Altis'],
    Honda: ['City', 'Civic', 'BR-V', 'Vezel', 'Fit', 'Grace', 'Accord', 'HR-V'],
    Suzuki: ['Alto', 'Cultus', 'Wagon R', 'Swift', 'Mehran', 'Bolan', 'Ravi', 'Ciaz', 'Baleno', 'Every'],
    Daihatsu: ['Mira', 'Move', 'Hijet', 'Cuore', 'Cast', 'Tanto'],
    Nissan: ['Dayz', 'Roox', 'Note', 'Juke', 'Sunny'],
    Kia: ['Sportage', 'Picanto', 'Stonic', 'Sorento', 'Carnival'],
    Hyundai: ['Tucson', 'Elantra', 'Sonata', 'Santro', 'Porter'],
    Changan: ['Alsvin', 'Oshan', 'Karvaan', 'M9', 'M8'],
    MG: ['HS', 'ZS', 'Cyberster'],
    Haval: ['H6', 'Jolion'],
    BYD: ['Atto 3', 'Seal', 'Dolphin', 'Sealion'],
    Chery: ['Tiggo 4', 'Tiggo 7', 'Tiggo 8'],
    Omoda: ['E5', 'C5', 'C7'],
    Jaecoo: ['J7', 'J8'],
    Proton: ['Saga', 'X70'],
    BAIC: ['BJ40', 'D20'],
    DFSK: ['Glory 580', 'Glory 500', 'C37']
  };

  const cityList = [
    'Rawalpindi', 'Islamabad', 'Lahore', 'Karachi', 'Peshawar', 'Multan', 'Faisalabad', 'Sialkot',
    'Gujranwala', 'Gujrat', 'Sargodha', 'Bahawalpur', 'Hyderabad', 'Sukkur', 'Quetta', 'Mardan',
    'Abbottabad', 'Sahiwal', 'Okara', 'Jhelum', 'Attock', 'Wah', 'Taxila', 'Rahim Yar Khan', 'Dera Ghazi Khan'
  ];

  const colors = [
    'White', 'Black', 'Silver', 'Grey', 'Gray', 'Red', 'Blue', 'Green', 'Golden', 'Beige', 'Brown',
    'Maroon', 'Pearl White', 'Graphite Grey', 'Gun Metallic', 'Super White'
  ];

  const registrationCities = [
    ...cityList,
    'Punjab', 'Sindh', 'KPK', 'Balochistan', 'AJK', 'Gilgit', 'Unregistered', 'Applied For'
  ];

  function storageKey(name) {
    return (CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS[name]) || `drivepk_bolo_v2_${name.toLowerCase()}`;
  }

  function safeJsonParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function getProfile() {
    return safeJsonParse(localStorage.getItem(storageKey('PROFILE')), null);
  }

  function saveProfile(profile) {
    localStorage.setItem(storageKey('PROFILE'), JSON.stringify(profile));
  }

  function getVehicles() {
    return safeJsonParse(localStorage.getItem(storageKey('VEHICLES')), []);
  }

  function saveVehicles(vehicles) {
    localStorage.setItem(storageKey('VEHICLES'), JSON.stringify(vehicles));
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    if (!amount) return 'PKR -';
    return `PKR ${amount.toLocaleString('en-PK')}`;
  }

  function formatDateTime(timestamp) {
    if (!timestamp) return '-';
    return new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  }

  function normalizeDigits(text) {
    const urduDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    return String(text || '').replace(/[۰-۹٠-٩]/g, (digit) => {
      const urduIndex = urduDigits.indexOf(digit);
      if (urduIndex >= 0) return String(urduIndex);
      const arabicIndex = arabicDigits.indexOf(digit);
      if (arabicIndex >= 0) return String(arabicIndex);
      return digit;
    });
  }

  function normalizeText(text) {
    return normalizeDigits(text)
      .replace(/[,،]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showSection(sectionId) {
    $$('.section').forEach((section) => section.classList.toggle('active', section.id === sectionId));
    els.navButtons.forEach((button) => button.classList.toggle('active', button.dataset.section === sectionId));

    if (sectionId === 'postSection') {
      const profile = getProfile();
      if (profile && profile.city && !els.vehicleCity.value.trim()) {
        els.vehicleCity.value = profile.city;
      }
      playPostGuideOnce();
    }

    if (sectionId === 'homeSection') {
      renderAll();
    }
  }

  function getDueVehicles() {
    const now = Date.now();
    return getVehicles().filter((vehicle) => vehicle.active && vehicle.status === 'available' && Number(vehicle.nextCheckAt || 0) <= now);
  }

  function hasDueVehicleLock() {
    return getDueVehicles().length > 0;
  }

  function setPostLocked(isLocked) {
    const disabled = Boolean(isLocked);
    els.recordBtn.disabled = disabled;
    els.submitVehicleBtn.disabled = disabled;

    if (disabled && mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    }
  }

  function renderLockNotice() {
    const due = getDueVehicles();
    if (due.length) {
      els.lockNotice.textContent = `${due.length} vehicle needs Sold / Available confirmation. You cannot post another vehicle until you update it.`;
      els.lockNotice.classList.remove('hidden');
      setPostLocked(true);
      return;
    }

    els.lockNotice.classList.add('hidden');
    els.lockNotice.textContent = '';
    setPostLocked(false);
  }

  function renderStats() {
    const vehicles = getVehicles();
    const active = vehicles.filter((vehicle) => vehicle.active && vehicle.status === 'available');
    const due = getDueVehicles();

    els.totalVehicles.textContent = String(vehicles.length);
    els.activeVehicles.textContent = String(active.length);
    els.dueVehicles.textContent = String(due.length);
    els.appStatus.textContent = due.length ? 'Action Required' : 'V2 Testing';
  }

  function vehicleTitle(vehicle) {
    return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || 'Vehicle';
  }

  function vehicleCardHtml(vehicle, options = {}) {
    const isDue = options.due || false;
    const soldClass = vehicle.status === 'sold' ? ' sold' : '';
    const dueClass = isDue ? ' due' : '';
    const statusText = vehicle.status === 'sold' ? 'Sold' : (isDue ? 'Needs update' : 'Available');
    const nextCheckText = vehicle.active ? `Next check: ${formatDateTime(vehicle.nextCheckAt)}` : 'Inactive';

    return `
      <article class="vehicle-card${dueClass}${soldClass}" data-id="${escapeHtml(vehicle.id)}">
        <div class="vehicle-title-row">
          <h3>${escapeHtml(vehicleTitle(vehicle))}</h3>
          <div class="vehicle-price">${escapeHtml(formatCurrency(vehicle.price))}</div>
        </div>
        <div class="vehicle-meta">
          <span>City: ${escapeHtml(vehicle.city || '-')}</span>
          <span>Color: ${escapeHtml(vehicle.color || '-')}</span>
          <span>Registered: ${escapeHtml(vehicle.registeredIn || '-')}</span>
          <span>Mileage: ${vehicle.mileage ? `${escapeHtml(Number(vehicle.mileage).toLocaleString('en-PK'))} KM` : '-'}</span>
          <span>Status: ${escapeHtml(statusText)}</span>
          <span>${escapeHtml(nextCheckText)}</span>
        </div>
        ${vehicle.extraInfo ? `<p class="vehicle-extra">${escapeHtml(vehicle.extraInfo)}</p>` : ''}
        <p class="vehicle-contact">Seller: ${escapeHtml(vehicle.sellerName || '-')} · Phone: ${escapeHtml(vehicle.phone || '-')} · WhatsApp: ${escapeHtml(vehicle.whatsapp || vehicle.phone || '-')}</p>
        <p class="vehicle-date">Posted: ${escapeHtml(formatDateTime(vehicle.createdAt))}</p>
        ${isDue ? `
          <div class="card-actions">
            <button class="success-btn mark-available-btn" type="button" data-id="${escapeHtml(vehicle.id)}">Still Available</button>
            <button class="danger-btn mark-sold-btn" type="button" data-id="${escapeHtml(vehicle.id)}">Sold</button>
          </div>
        ` : ''}
      </article>
    `;
  }

  function renderDuePanel() {
    const due = getDueVehicles();
    if (!due.length) {
      els.duePanel.classList.add('hidden');
      els.dueList.innerHTML = '';
      return;
    }

    els.duePanel.classList.remove('hidden');
    els.dueList.innerHTML = due.map((vehicle) => vehicleCardHtml(vehicle, { due: true })).join('');
  }

  function renderRecentVehicles() {
    const vehicles = getVehicles().slice().sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    if (!vehicles.length) {
      els.recentVehicles.className = 'vehicle-list empty-state';
      els.recentVehicles.textContent = 'No vehicle posted yet.';
      return;
    }

    els.recentVehicles.className = 'vehicle-list';
    els.recentVehicles.innerHTML = vehicles.slice(0, 12).map((vehicle) => vehicleCardHtml(vehicle)).join('');
  }

  function renderAll() {
    renderStats();
    renderLockNotice();
    renderDuePanel();
    renderRecentVehicles();
  }

  function updateVehicleStatus(id, status) {
    const vehicles = getVehicles();
    const updated = vehicles.map((vehicle) => {
      if (vehicle.id !== id) return vehicle;

      if (status === 'sold') {
        return {
          ...vehicle,
          status: 'sold',
          active: false,
          soldAt: Date.now(),
          updatedAt: Date.now()
        };
      }

      return {
        ...vehicle,
        status: 'available',
        active: true,
        lastConfirmedAt: Date.now(),
        nextCheckAt: Date.now() + EXPIRY_MS,
        updatedAt: Date.now()
      };
    });

    saveVehicles(updated);
    renderAll();
  }

  function loadProfileIntoForm() {
    const profile = getProfile();
    if (!profile) return;

    els.profileName.value = profile.fullName || '';
    els.profilePhone.value = profile.phone || '';
    els.profileWhatsapp.value = profile.whatsapp || '';
    els.profileCity.value = profile.city || '';
    els.profileEmail.value = profile.email || '';
  }

  function getProfileFromForm() {
    return {
      fullName: els.profileName.value.trim(),
      phone: els.profilePhone.value.trim(),
      whatsapp: els.profileWhatsapp.value.trim(),
      city: els.profileCity.value.trim(),
      email: els.profileEmail.value.trim(),
      savedAt: Date.now()
    };
  }

  function resetVehicleForm() {
    els.vehicleForm.reset();
    const profile = getProfile();
    if (profile && profile.city) {
      els.vehicleCity.value = profile.city;
    }
    els.transcriptBox.classList.add('hidden');
    els.transcriptText.textContent = '';
    els.postStatus.textContent = '';
  }

  function getVehicleFromForm(profile) {
    return {
      id: `veh_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      make: els.vehicleMake.value.trim(),
      model: els.vehicleModel.value.trim(),
      year: Number(els.vehicleYear.value || 0),
      price: Number(els.vehiclePrice.value || 0),
      city: els.vehicleCity.value.trim() || profile.city || '',
      color: els.vehicleColor.value.trim(),
      registeredIn: els.vehicleRegisteredIn.value.trim(),
      mileage: Number(els.vehicleMileage.value || 0),
      extraInfo: els.vehicleExtraInfo.value.trim(),
      sellerName: profile.fullName,
      phone: profile.phone,
      whatsapp: profile.whatsapp || profile.phone,
      email: profile.email || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nextCheckAt: Date.now() + EXPIRY_MS,
      status: 'available',
      active: true,
      sourceTranscript: els.transcriptText.textContent.trim()
    };
  }

  function fillField(input, value) {
    if (value === undefined || value === null || value === '') return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function findKnownValue(text, list) {
    const clean = ` ${text.toLowerCase()} `;
    const sorted = list.slice().sort((a, b) => b.length - a.length);
    return sorted.find((item) => clean.includes(` ${item.toLowerCase()} `)) || '';
  }

  function extractMakeModel(text) {
    const lower = ` ${text.toLowerCase()} `;
    let detectedMake = '';
    let detectedModel = '';

    Object.entries(makeModels).some(([make, models]) => {
      if (lower.includes(` ${make.toLowerCase()} `)) {
        detectedMake = make;
      }

      const matchedModel = models
        .slice()
        .sort((a, b) => b.length - a.length)
        .find((model) => lower.includes(` ${model.toLowerCase()} `));

      if (matchedModel) {
        detectedMake = make;
        detectedModel = matchedModel;
        return true;
      }

      return false;
    });

    return { make: detectedMake, model: detectedModel };
  }

  function extractYear(text) {
    const match = text.match(/\b(19[8-9]\d|20[0-3]\d)\b/);
    return match ? Number(match[1]) : '';
  }

  function extractPrice(text) {
    const clean = text.toLowerCase();
    const croreMatch = clean.match(/(?:price|demand|qeemat|keemat|rate|rs|pkr|rupees)?\s*(\d+(?:\.\d+)?)\s*(crore|cror|karor|کروڑ)/i);
    if (croreMatch) return Math.round(Number(croreMatch[1]) * 10000000);

    const lakhMatch = clean.match(/(?:price|demand|qeemat|keemat|rate|rs|pkr|rupees)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lak|لاکھ)/i);
    if (lakhMatch) return Math.round(Number(lakhMatch[1]) * 100000);

    const millionMatch = clean.match(/(?:price|demand|qeemat|keemat|rate|rs|pkr|rupees)?\s*(\d+(?:\.\d+)?)\s*million/i);
    if (millionMatch) return Math.round(Number(millionMatch[1]) * 1000000);

    const directPrice = clean.match(/(?:price|demand|qeemat|keemat|rate|rs|pkr|rupees)\s*(?:is|hai|hy|=|:)?\s*(\d{5,9})/i);
    if (directPrice) return Number(directPrice[1]);

    return '';
  }

  function extractMileage(text) {
    const clean = text.toLowerCase();
    const afterKeyword = clean.match(/(?:mileage|milage|meter|running|chali|chalai|kilometer|kilometers|km)\s*(?:is|hai|hy|=|:)?\s*(\d{1,6})/i);
    if (afterKeyword) return Number(afterKeyword[1]);

    const beforeKeyword = clean.match(/\b(\d{4,6})\s*(?:km|kilometer|kilometers|chali hui|chalai hui)\b/i);
    if (beforeKeyword) return Number(beforeKeyword[1]);

    return '';
  }

  function extractCity(text) {
    const cityByKeyword = text.match(/(?:city|shehar|location|jaga)\s*(?:is|hai|hy|=|:)?\s*([a-zA-Z ]{3,25})/i);
    if (cityByKeyword) {
      const candidate = cityList.find((city) => cityByKeyword[1].toLowerCase().includes(city.toLowerCase()));
      if (candidate) return candidate;
    }
    return findKnownValue(text, cityList);
  }

  function extractRegisteredIn(text) {
    const clean = text.toLowerCase();
    const regMatch = clean.match(/(?:registered in|registration|register|reg|number)\s*(?:is|hai|hy|=|:)?\s*([a-zA-Z ]{3,25})/i);
    if (regMatch) {
      const candidate = registrationCities.find((city) => regMatch[1].toLowerCase().includes(city.toLowerCase()));
      if (candidate) return candidate;
    }
    return '';
  }

  function parseVehicleDetails(rawTranscript) {
    const text = normalizeText(rawTranscript);
    const makeModel = extractMakeModel(text);
    const parsed = {
      make: makeModel.make,
      model: makeModel.model,
      year: extractYear(text),
      price: extractPrice(text),
      city: extractCity(text),
      color: findKnownValue(text, colors),
      registeredIn: extractRegisteredIn(text),
      mileage: extractMileage(text),
      extraInfo: text
    };

    return parsed;
  }

  function applyParsedDetails(parsed) {
    fillField(els.vehicleMake, parsed.make);
    fillField(els.vehicleModel, parsed.model);
    fillField(els.vehicleYear, parsed.year);
    fillField(els.vehiclePrice, parsed.price);
    fillField(els.vehicleCity, parsed.city);
    fillField(els.vehicleColor, parsed.color);
    fillField(els.vehicleRegisteredIn, parsed.registeredIn);
    fillField(els.vehicleMileage, parsed.mileage);

    if (parsed.extraInfo && !els.vehicleExtraInfo.value.trim()) {
      fillField(els.vehicleExtraInfo, parsed.extraInfo);
    }

    const detected = [
      parsed.make || '-',
      parsed.model || '-',
      parsed.year || '-',
      parsed.price ? formatCurrency(parsed.price) : 'PKR -',
      parsed.city || '-'
    ].join(' · ');

    els.postStatus.textContent = `Detected: ${detected}`;
  }

  async function playTextWithServerVoice(text) {
    if (!CONFIG.VOICE_URL) {
      throw new Error('VOICE_URL is missing in config.js');
    }

    if (activeGuideAudio) {
      activeGuideAudio.pause();
      activeGuideAudio = null;
    }

    const formData = new FormData();
    formData.append('text', text);

    const response = await fetch(CONFIG.VOICE_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Voice server error ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    activeGuideAudio = new Audio(audioUrl);
    activeGuideAudio.addEventListener('ended', () => URL.revokeObjectURL(audioUrl), { once: true });
    await activeGuideAudio.play();
  }

  async function playPostGuideOnce() {
    const playedKey = storageKey('GUIDE_PLAYED');
    if (sessionStorage.getItem(playedKey) === '1') return;
    sessionStorage.setItem(playedKey, '1');
    await playGuideSafe();
  }

  async function playGuideSafe() {
    const text = 'Assalam o Alaikum. Post vehicle ke liye record button dabain. Company, model, year, price, city, color, registration, mileage aur extra tafseel wazeh bolain.';
    try {
      await playTextWithServerVoice(text);
    } catch (error) {
      console.warn(error);
      els.recordingHelp.textContent = 'Voice guide could not play. You can still record vehicle details.';
    }
  }

  function getSupportedMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];

    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function setRecordingUi(isRecording, message) {
    els.recorderCard.classList.toggle('recording', isRecording);
    els.recordBtn.textContent = isRecording ? 'Stop Recording' : 'Start Recording';
    els.recordingStatus.textContent = message || (isRecording ? 'Recording...' : 'Ready to record');
  }

  function updateRecordingTimer() {
    const elapsed = Math.max(0, Math.floor((Date.now() - recordingStartedAt) / 1000));
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    els.recordTimer.textContent = `${minutes}:${seconds}`;
  }

  function cleanupRecordingResources() {
    clearInterval(recordingTimerId);
    clearTimeout(maxRecordingTimerId);
    recordingTimerId = null;
    maxRecordingTimerId = null;

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
  }

  async function startRecording() {
    if (hasDueVehicleLock()) {
      els.postStatus.textContent = 'First mark due vehicle as Sold or Still Available.';
      renderAll();
      return;
    }

    const profile = getProfile();
    if (!profile || !profile.fullName || !profile.phone) {
      els.postStatus.textContent = 'First save seller profile with name and phone number.';
      showSection('profileSection');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      els.postStatus.textContent = 'This browser does not support audio recording. Use Chrome on Android for testing.';
      return;
    }

    audioChunks = [];
    els.transcriptBox.classList.add('hidden');
    els.transcriptText.textContent = '';
    els.postStatus.textContent = '';

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mimeType = getSupportedMimeType();
      mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });

      mediaRecorder.addEventListener('stop', async () => {
        cleanupRecordingResources();
        setRecordingUi(false, 'Uploading audio...');
        els.recordBtn.disabled = true;

        const blobType = mediaRecorder && mediaRecorder.mimeType ? mediaRecorder.mimeType : 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: blobType });

        try {
          const transcript = await uploadForTranscription(audioBlob);
          handleTranscript(transcript);
          setRecordingUi(false, 'Ready to record');
        } catch (error) {
          console.error(error);
          els.postStatus.textContent = `Transcription failed: ${error.message}`;
          setRecordingUi(false, 'Transcription failed');
        } finally {
          els.recordBtn.disabled = hasDueVehicleLock();
          mediaRecorder = null;
          audioChunks = [];
        }
      });

      mediaRecorder.start();
      recordingStartedAt = Date.now();
      updateRecordingTimer();
      recordingTimerId = setInterval(updateRecordingTimer, 250);
      maxRecordingTimerId = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
      }, MAX_RECORDING_SECONDS * 1000);

      setRecordingUi(true, 'Recording... speak vehicle details clearly');
    } catch (error) {
      cleanupRecordingResources();
      console.error(error);
      els.postStatus.textContent = 'Microphone permission failed or recording could not start.';
      setRecordingUi(false, 'Ready to record');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setRecordingUi(false, 'Stopping...');
    }
  }

  async function uploadForTranscription(audioBlob) {
    if (!CONFIG.TRANSCRIBE_URL) {
      throw new Error('TRANSCRIBE_URL is missing in config.js');
    }

    if (!audioBlob || audioBlob.size < 1000) {
      throw new Error('Audio recording is too short. Please record again.');
    }

    const extension = audioBlob.type.includes('mp4') ? 'm4a' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
    const formData = new FormData();
    formData.append('audio', audioBlob, `drivepk-vehicle-recording.${extension}`);
    formData.append('language', 'ur');
    formData.append('task', 'vehicle_post');

    const response = await fetch(CONFIG.TRANSCRIBE_URL, {
      method: 'POST',
      body: formData
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `Server error ${response.status}`);
    }

    if (contentType.includes('application/json')) {
      const data = await response.json();
      const transcript = data.transcript || data.text || data.detected_text || data.result || '';
      if (!transcript) throw new Error(data.error || 'No transcript returned by server.');
      return transcript;
    }

    const text = await response.text();
    if (!text.trim()) throw new Error('Empty transcript returned by server.');
    return text.trim();
  }

  function handleTranscript(transcript) {
    const cleanTranscript = normalizeText(transcript);
    els.transcriptBox.classList.remove('hidden');
    els.transcriptText.textContent = cleanTranscript;

    const parsed = parseVehicleDetails(cleanTranscript);
    applyParsedDetails(parsed);
  }

  function submitVehicle(event) {
    event.preventDefault();

    if (hasDueVehicleLock()) {
      els.postStatus.textContent = 'First mark due vehicle as Sold or Still Available.';
      renderAll();
      return;
    }

    const profile = getProfile();
    if (!profile || !profile.fullName || !profile.phone) {
      els.postStatus.textContent = 'Seller profile is required before posting.';
      showSection('profileSection');
      return;
    }

    if (!els.vehicleForm.reportValidity()) return;

    const vehicle = getVehicleFromForm(profile);
    const vehicles = getVehicles();
    vehicles.push(vehicle);
    saveVehicles(vehicles);

    resetVehicleForm();
    renderAll();
    showSection('homeSection');
  }

  function runSearch() {
    const query = normalizeText(els.searchInput.value).toLowerCase();
    const vehicles = getVehicles().filter((vehicle) => vehicle.active && vehicle.status === 'available');

    if (!query) {
      els.searchResults.className = 'vehicle-list empty-state';
      els.searchResults.textContent = 'Type make, model, city, year, price or color to search.';
      return;
    }

    const results = vehicles.filter((vehicle) => {
      const haystack = [
        vehicle.make,
        vehicle.model,
        vehicle.year,
        vehicle.price,
        vehicle.city,
        vehicle.color,
        vehicle.registeredIn,
        vehicle.mileage,
        vehicle.extraInfo,
        vehicle.sellerName
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });

    if (!results.length) {
      els.searchResults.className = 'vehicle-list empty-state';
      els.searchResults.textContent = 'No matching active vehicle found in this browser.';
      return;
    }

    els.searchResults.className = 'vehicle-list';
    els.searchResults.innerHTML = results.map((vehicle) => vehicleCardHtml(vehicle)).join('');
  }

  function bindEvents() {
    els.navButtons.forEach((button) => {
      button.addEventListener('click', () => showSection(button.dataset.section));
    });

    els.goPostBtn.addEventListener('click', () => showSection('postSection'));
    els.goProfileBtn.addEventListener('click', () => showSection('profileSection'));

    els.profileForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const profile = getProfileFromForm();
      if (!profile.fullName || !profile.phone) {
        els.profileSaveStatus.textContent = 'Name and phone number are required.';
        return;
      }
      saveProfile(profile);
      els.profileSaveStatus.textContent = 'Profile saved in this browser.';

      if (!els.vehicleCity.value.trim() && profile.city) {
        els.vehicleCity.value = profile.city;
      }
    });

    els.clearProfileBtn.addEventListener('click', () => {
      localStorage.removeItem(storageKey('PROFILE'));
      els.profileForm.reset();
      els.profileSaveStatus.textContent = 'Profile cleared from this browser.';
    });

    els.playGuideBtn.addEventListener('click', playGuideSafe);

    els.recordBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
      } else {
        startRecording();
      }
    });

    els.resetPostBtn.addEventListener('click', resetVehicleForm);
    els.vehicleForm.addEventListener('submit', submitVehicle);

    els.dueList.addEventListener('click', (event) => {
      const soldButton = event.target.closest('.mark-sold-btn');
      const availableButton = event.target.closest('.mark-available-btn');

      if (soldButton) updateVehicleStatus(soldButton.dataset.id, 'sold');
      if (availableButton) updateVehicleStatus(availableButton.dataset.id, 'available');
    });

    els.clearSoldBtn.addEventListener('click', () => {
      const activeOrAvailable = getVehicles().filter((vehicle) => vehicle.status !== 'sold');
      saveVehicles(activeOrAvailable);
      renderAll();
    });

    els.searchBtn.addEventListener('click', runSearch);
    els.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') runSearch();
    });

    window.addEventListener('beforeunload', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') stopRecording();
      cleanupRecordingResources();
    });
  }

  function boot() {
    loadProfileIntoForm();
    const profile = getProfile();
    if (profile && profile.city) {
      els.vehicleCity.value = profile.city;
    }

    bindEvents();
    renderAll();

    setInterval(renderAll, 30 * 1000);
  }

  boot();
})();

