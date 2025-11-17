/******************************
 * CONFIG & SETUP
 ******************************/
const firebaseConfig = {
  apiKey: "AIzaSyDh6VeAKGSJas6jc5F9mdNNIZhDJWH4W_8",
  authDomain: "creators-9b295.firebaseapp.com",
  projectId: "creators-9b295",
  storageBucket: "creators-9b295.firebasestorage.app",
  messagingSenderId: "300397094559",
  appId: "1:300397094559:web:fc66381db4362d12e664aa"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let creators = [];
let filteredCreators = [];
let selectedProfile = null;

function $(id){ return document.getElementById(id); }

/******************************
 * LOAD & DISPLAY CREATORS
 ******************************/
async function loadCreators(){
  console.log('Loading creators...');
  $('loadingIndicator').style.display = 'block';
  $('creatorsGrid').style.display = 'none';
  $('emptyState').style.display = 'none';
  
  try {
    const snap = await db.collection('creators')
      .orderBy('createdAt', 'desc')
      .get();
    
    console.log(`Found ${snap.docs.length} creators`);
    
    creators = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unknown',
        category: data.category || '',
        location: data.location || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        bio: data.bio || '',
        profileImageUrl: data.profileImageUrl || '',
        imageUrls: data.imageUrls || [],
        videoUrls: data.videoUrls || [],
        verified: data.verified !== false,
        createdAt: data.createdAt || new Date()
      };
    });

    // Filter only verified creators
    filteredCreators = creators.filter(c => c.verified);
    console.log(`${filteredCreators.length} verified creators`);
    
    displayCreators(filteredCreators);
    
  } catch(err) {
    console.error('Error loading creators:', err);
    $('loadingIndicator').innerHTML = `
      <div style="color: var(--danger); padding: 20px; text-align: center;">
        <div style="font-size: 24px;">⚠️</div>
        <div>Unable to load escorts</div>
        <div class="small" style="margin-top: 8px;">${err.message}</div>
        <button class="btn primary" onclick="loadCreators()" style="margin-top: 10px;">
          Try Again
        </button>
      </div>
    `;
  }
}

function displayCreators(creatorsToShow = []) {
  console.log(`Displaying ${creatorsToShow.length} creators`);
  
  $('loadingIndicator').style.display = 'none';
  const grid = $('creatorsGrid');
  const empty = $('emptyState');

  if(!creatorsToShow.length){
    grid.style.display = 'none';
    empty.style.display = 'block';
    $('resultCount').innerText = '0 verified escorts';
    return;
  }

  grid.innerHTML = '';
  creatorsToShow.forEach(c => {
    const card = document.createElement('div');
    card.className = 'creator-card';
    card.onclick = () => openProfile(c);

    const imgHtml = c.profileImageUrl ? 
      `<img src="${c.profileImageUrl}" alt="${c.name}" style="width:100%;height:100%;object-fit:cover">` : 
      `<div style="color:white;font-size:44px;display:flex;align-items:center;justify-content:center;height:100%">👤</div>`;

    card.innerHTML = `
      <div class="creator-image">
        ${imgHtml}
        <div class="verified-label">✅ Verified</div>
      </div>
      <div class="creator-info">
        <div>
          <div class="creator-name">${c.name}</div>
          <div class="small">${c.category} • ${c.location}</div>
        </div>
        <div class="small">📞 ${c.phone || 'Contact for details'}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.style.display = 'grid';
  empty.style.display = 'none';
  $('resultCount').innerText = `${creatorsToShow.length} verified escorts`;
}

/******************************
 * FILTERS
 ******************************/
function applyFilters() {
  const search = $('searchInput').value.toLowerCase().trim();
  const location = $('locationSelect').value;
  const category = $('categorySelect').value;

  let filtered = creators.filter(c => c.verified);

  if(search) {
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.location.toLowerCase().includes(search) ||
      c.category.toLowerCase().includes(search)
    );
  }

  if(location) {
    filtered = filtered.filter(c => c.location === location);
  }

  if(category) {
    filtered = filtered.filter(c => c.category === category);
  }

  filteredCreators = filtered;
  displayCreators(filteredCreators);
}

function filterByCity(city, event) {
  // Remove active class from all buttons
  document.querySelectorAll('.quick-locations button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to clicked button
  if(event && event.target) {
    event.target.classList.add('active');
  }
  
  // Set location select and apply filter
  $('locationSelect').value = city;
  applyFilters();
}

/******************************
 * PROFILE VIEW
 ******************************/
function openProfile(creator) {
  selectedProfile = creator;
  const page = $('profilePage');
  
  $('profileName').textContent = creator.name;
  $('profileCategory').textContent = creator.category;
  $('profileLocation').textContent = creator.location;
  $('profilePhone').textContent = creator.phone;
  $('profileWhatsapp').textContent = creator.whatsapp;
  $('profileBio').textContent = creator.bio || 'No bio available';
  
  // Profile image
  const imgLarge = $('profileImageLarge');
  if(creator.profileImageUrl) {
    imgLarge.src = creator.profileImageUrl;
    imgLarge.style.display = 'block';
  } else {
    imgLarge.style.display = 'none';
  }
  
  // Photos grid
  const photosGrid = $('photosGrid');
  photosGrid.innerHTML = '';
  if(creator.imageUrls && creator.imageUrls.length) {
    creator.imageUrls.forEach(url => {
      const div = document.createElement('div');
      div.className = 'media-item';
      div.innerHTML = `<img src="${url}" style="width:100%;height:150px;object-fit:cover;border-radius:8px">`;
      photosGrid.appendChild(div);
    });
  } else {
    photosGrid.innerHTML = '<div class="small">No photos available</div>';
  }
  
  // Videos grid
  const videosGrid = $('videosGrid');
  videosGrid.innerHTML = '';
  if(creator.videoUrls && creator.videoUrls.length) {
    creator.videoUrls.forEach(url => {
      const div = document.createElement('div');
      div.className = 'media-item';
      div.innerHTML = `<video src="${url}" controls style="width:100%;height:150px;object-fit:cover;border-radius:8px"></video>`;
      videosGrid.appendChild(div);
    });
  } else {
    videosGrid.innerHTML = '<div class="small">No videos available</div>';
  }
  
  page.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProfile() {
  $('profilePage').classList.remove('active');
  document.body.style.overflow = 'auto';
  selectedProfile = null;
}

function callCreator() {
  if(selectedProfile && selectedProfile.phone) {
    window.location.href = `tel:${selectedProfile.phone}`;
  }
}

function whatsappCreator() {
  if(selectedProfile && selectedProfile.whatsapp) {
    const phone = selectedProfile.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  }
}

/******************************
 * BANNERS
 ******************************/
async function loadActiveBanners(){
  console.log('Loading banners...');
  
  try {
    // Simplified query - no index needed
    const snap = await db.collection('banners')
      .limit(10)
      .get();
    
    // Filter active banners in code instead
    const activeBanners = snap.docs.filter(doc => doc.data().active === true);
    
    console.log(`Found ${snap.docs.length} active banners`);
    
    const grid = $('bannersGrid');
    if(!grid) return;
    
    grid.innerHTML = '';
    
    if(snap.empty){
      console.log('No banners found, showing placeholder');
      const placeholder = document.createElement('div');
      placeholder.className = 'banner-card';
      placeholder.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--muted);">
          <div style="font-size: 24px; margin-bottom: 8px;">📢</div>
          <div>Advertisement Space Available</div>
          <div class="small" style="margin-top: 8px;">Contact to advertise your services</div>
        </div>
      `;
      grid.appendChild(placeholder);
      return;
    }
    
    snap.docs.forEach(doc => {
      const banner = doc.data();
      const bannerCard = document.createElement('div');
      bannerCard.className = 'banner-card';
      bannerCard.innerHTML = `
        <img src="${banner.imageUrl}" class="banner-image" alt="Advertisement" 
             onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'padding:20px;text-align:center;color:var(--muted)\\'>Advertisement</div>';">
      `;
      grid.appendChild(bannerCard);
    });
    
  } catch(err) {
    console.error('Error loading banners:', err);
    const grid = $('bannersGrid');
    if(grid){
      grid.innerHTML = '';
      const placeholder = document.createElement('div');
      placeholder.className = 'banner-card';
      placeholder.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--muted);">
          <div>Advertisement</div>
        </div>
      `;
      grid.appendChild(placeholder);
    }
  }
}

/******************************
 * REGISTRATION
 ******************************/
function openRegistration() {
  window.location.href = 'login.html';
}

/******************************
 * SHARED UI FUNCTIONS
 ******************************/
let _inputResolve, _inputReject;

function showAlert(title, msg){
  $('alertTitle').innerText = title || 'Notice';
  $('alertMsg').innerText = msg || '';
  $('alertBox').style.display = 'block';
  $('alertBox').setAttribute('aria-hidden','false');
}

function closeAlert(){
  $('alertBox').style.display = 'none';
  $('alertBox').setAttribute('aria-hidden','true');
}

function askInput({title='Enter value', desc='', placeholder='', type='text'}){
  return new Promise((res, rej) => {
    _inputResolve = res; _inputReject = rej;
    $('inputTitle').innerText = title;
    $('inputDesc').innerText = desc || '';
    const f = $('inputField');
    f.type = type || 'text';
    f.value = '';
    f.placeholder = placeholder || '';
    $('inputBox').style.display = 'block';
    $('inputBox').setAttribute('aria-hidden','false');
    setTimeout(()=> f.focus(),100);
  });
}

function resolveInput(){
  const v = $('inputField').value;
  $('inputBox').style.display = 'none';
  $('inputBox').setAttribute('aria-hidden','true');
  if(_inputResolve) _inputResolve(v);
  _inputResolve = null; _inputReject = null;
}

function rejectInput(){
  $('inputBox').style.display = 'none';
  $('inputBox').setAttribute('aria-hidden','true');
  if(_inputReject) _inputReject(null);
  _inputResolve = null; _inputReject = null;
}

function showLoading(text='Working — please wait...'){
  $('loadingText').innerText = text;
  $('loadingOverlay').style.display = 'flex';
}

function hideLoading(){ 
  $('loadingOverlay').style.display = 'none'; 
}

/******************************
 * INITIALIZATION
 ******************************/
async function initializeApp() {
  console.log('Initializing app...');
  showLoading('Loading escorts...');
  
  try {
    // Load both creators and banners
    await Promise.all([
      loadCreators(),
      loadActiveBanners()
    ]);
    
    hideLoading();
    console.log('App initialized successfully');
    
  } catch (error) {
    console.error('Initialization error:', error);
    hideLoading();
    
    showAlert('Error', 'Failed to load data. Please refresh the page.');
  }
}

// Start the app when page loads
window.addEventListener('load', initializeApp);
