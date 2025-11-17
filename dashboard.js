/******************************
 * CONFIG & ORIGINAL SETUP
 ******************************/
const firebaseConfig = {
  apiKey: "AIzaSyDh6VeAKGSJas6jc5F9mdNNIZhDJWH4W_8",
  authDomain: "creators-9b295.firebaseapp.com",
  projectId: "creators-9b295",
  storageBucket: "creators-9b295.firebasestorage.app",
  messagingSenderId: "300397094559",
  appId: "1:300397094559:web:fc66381db4362d12e664aa"
};

const FLUTTERWAVE_PUBLIC_KEY = "";
const REGISTRATION_FEE = 20000;
const FREE_TRIAL_DAYS = 60;

const CLOUDINARY_NAME = "dadd7hhf1";
const CLOUDINARY_UPLOAD_PRESET = "escorts";

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let currentCreatorData = null;

function $(id){ return document.getElementById(id); }

/******************************
 * AUTHENTICATION & INIT
 ******************************/
async function initializeDashboard() {
  showLoading('Checking authentication...');
  
  // Check if user is logged in
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // User is logged in - load dashboard
      currentUser = user;
      await loadCreatorData();
      hideLoading();
    } else {
      // User not logged in - redirect to main site
      hideLoading();
      showAlert('Login Required', 'Please login from the main site first.');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    }
  });
}

async function loadCreatorData() {
  try {
    const doc = await db.collection('creators').doc(currentUser.uid).get();
    
    if (!doc.exists) {
      showAlert('Error', 'Creator profile not found.');
      logoutCreator();
      return;
    }
    
    currentCreatorData = { uid: doc.id, ...doc.data() };
    populateDashboard();
    
  } catch (error) {
    console.error('Error loading creator data:', error);
    showAlert('Error', 'Failed to load profile data.');
  }
}

function populateDashboard() {
  if (!currentCreatorData) return;
  
  // Sidebar info
  $('sidebarName').textContent = currentCreatorData.name;
  $('sidebarEmail').textContent = currentUser.email;
  $('sidebarAvatar').textContent = currentCreatorData.name.charAt(0).toUpperCase();
  
  // Edit panel
  $('editName').value = currentCreatorData.name || '';
  $('editCategory').value = currentCreatorData.category || '';
  $('editLocation').value = currentCreatorData.location || '';
  $('editPhone').value = currentCreatorData.phone || '';
  $('editWhatsapp').value = currentCreatorData.whatsapp || '';
  $('editBio').value = currentCreatorData.bio || '';
  
  // Profile image preview
  const preview = $('currentProfilePreview');
  if (currentCreatorData.profileImageUrl) {
    preview.innerHTML = `<img src="${currentCreatorData.profileImageUrl}" alt="Current profile" style="max-height:140px;border-radius:10px">`;
  } else {
    preview.innerHTML = '<div class="small">No profile image set</div>';
  }
  
  // Account panel
  $('dashboardEmail').textContent = currentUser.email;
  
  // Trial ends date
  if (currentCreatorData.trialEndsAt) {
    const trialEnds = new Date(currentCreatorData.trialEndsAt);
    const formattedDate = trialEnds.toLocaleDateString();
    $('trialEnds').textContent = formattedDate;
    $('trialEndsFS').textContent = formattedDate;
  }
  
  // Load galleries
  loadDashboardImages();
  loadDashboardVideos();
  loadDashboardBanners();
}

/******************************
 * DASHBOARD NAVIGATION
 ******************************/
function switchPanel(panelName) {
  // Hide all panels
  const panels = ['edit','gallery','videos','ads','account'];
  panels.forEach(p => {
    const el = $('panel' + (p === 'edit' ? 'Edit' : p.charAt(0).toUpperCase()+p.slice(1)));
    if(el) el.style.display = 'none';
    const nav = $('nav' + (p === 'edit' ? 'Profile' : p.charAt(0).toUpperCase()+p.slice(1)));
    if(nav) nav.classList.remove('active');
  });
  
  // Show selected panel and activate nav link
  const panelEl = $('panel' + (panelName === 'edit' ? 'Edit' : panelName.charAt(0).toUpperCase()+panelName.slice(1)));
  const navEl = $('nav' + (panelName === 'edit' ? 'Profile' : panelName.charAt(0).toUpperCase()+panelName.slice(1)));
  
  if(panelEl) panelEl.style.display = 'block';
  if(navEl) navEl.classList.add('active');
  
  // Refresh data if needed
  if(panelName === 'gallery') loadDashboardImages();
  if(panelName === 'videos') loadDashboardVideos();
  if(panelName === 'ads') loadDashboardBanners();
}

/******************************
 * PROFILE MANAGEMENT
 ******************************/
async function updateProfile() {
  if(!currentUser) return;
  
  try {
    showLoading('Updating profile...');
    const updates = {
      name: $('editName').value.trim(),
      category: $('editCategory').value.trim(),
      location: $('editLocation').value.trim(),
      phone: $('editPhone').value.trim(),
      whatsapp: $('editWhatsapp').value.trim(),
      bio: $('editBio').value.trim()
    };
    
    const pf = $('editProfileImage')?.files?.[0];
    if(pf){
      const url = await uploadFile(pf, 'profiles');
      updates.profileImageUrl = url;
    }
    
    await db.collection('creators').doc(currentUser.uid).update(updates);
    const doc = await db.collection('creators').doc(currentUser.uid).get();
    currentCreatorData = { id: doc.id, ...doc.data() };
    
    hideLoading();
    showAlert('Success', 'Profile updated successfully!');
    populateDashboard();
    
  } catch(err) {
    hideLoading();
    console.error('Error updating profile', err);
    showAlert('Error', 'Update failed: ' + (err.message || err));
  }
}

/******************************
 * MEDIA UPLOAD FUNCTIONS
 ******************************/
async function uploadNewImages() {
  if(!currentUser) return showAlert('Error', 'You must be logged in.');
  
  const files = Array.from($('addImages')?.files || []);
  if(!files.length) return showAlert('Info', 'No images selected');
  
  try {
    showLoading('Uploading images...');
    const urls = [];
    for(const f of files){
      const u = await uploadFile(f, 'gallery');
      urls.push(u);
    }
    
    await db.collection('creators').doc(currentUser.uid).update({
      imageUrls: firebase.firestore.FieldValue.arrayUnion(...urls)
    });
    
    const doc = await db.collection('creators').doc(currentUser.uid).get();
    currentCreatorData = { id: doc.id, ...doc.data() };
    loadDashboardImages();
    
    hideLoading();
    showAlert('Success', 'Images uploaded successfully!');
    
  } catch(err) {
    hideLoading();
    console.error('Upload images error', err);
    showAlert('Error', 'Upload failed: ' + err.message);
  }
}

async function uploadNewVideos() {
  if(!currentUser) return showAlert('Error', 'You must be logged in.');
  
  const files = Array.from($('addVideos')?.files || []);
  if(!files.length) return showAlert('Info', 'No videos selected');
  
  try {
    showLoading('Uploading videos...');
    const urls = [];
    for(const f of files){
      const u = await uploadFile(f, 'videos');
      urls.push(u);
    }
    
    await db.collection('creators').doc(currentUser.uid).update({
      videoUrls: firebase.firestore.FieldValue.arrayUnion(...urls)
    });
    
    const doc = await db.collection('creators').doc(currentUser.uid).get();
    currentCreatorData = { id: doc.id, ...doc.data() };
    loadDashboardVideos();
    
    hideLoading();
    showAlert('Success', 'Videos uploaded successfully!');
    
  } catch(err) {
    hideLoading();
    console.error('Upload videos error', err);
    showAlert('Error', 'Upload failed: ' + err.message);
  }
}

async function uploadNewBanner() {
  if(!currentUser) return showAlert('Error', 'You must be logged in.');
  
  const files = Array.from($('addBanner')?.files || []);
  if(!files.length) return showAlert('Info', 'No banner image selected');
  
  try {
    showLoading('Uploading banner...');
    const duration = parseInt($('bannerDuration').value) || 7;
    const bannerUrl = await uploadFile(files[0], 'banners');
    
    const newBanner = {
      imageUrl: bannerUrl,
      creatorId: currentUser.uid,
      creatorName: currentCreatorData.name,
      duration: duration,
      expiresAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      active: true
    };
    
    await db.collection('banners').add(newBanner);
    hideLoading();
    showAlert('Success', 'Banner uploaded successfully!');
    loadDashboardBanners();
    
  } catch(err) {
    hideLoading();
    console.error('Upload banner error', err);
    showAlert('Error', 'Upload failed: ' + err.message);
  }
}

/******************************
 * CLOUDINARY UPLOAD
 ******************************/
async function uploadFile(file, folder){
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if(folder) form.append('folder', folder);
  
  try {
    const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/auto/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.secure_url;
  } catch(err) {
    console.error('Cloudinary upload error', err);
    throw err;
  }
}

/******************************
 * MEDIA DISPLAY FUNCTIONS
 ******************************/
function loadDashboardImages() {
  const grid = $('dashboardImagesGrid');
  grid.innerHTML = '';
  
  if(!currentCreatorData || !currentCreatorData.imageUrls || !currentCreatorData.imageUrls.length){
    grid.innerHTML = '<div class="small">No images yet</div>'; 
    return;
  }
  
  currentCreatorData.imageUrls.forEach((u, idx) => {
    const d = document.createElement('div');
    d.className = 'media-item';
    d.innerHTML = `<img src="${u}" style="width:100%;height:120px;object-fit:cover;border-radius:8px">`;
    grid.appendChild(d);
  });
}

function loadDashboardVideos() {
  const grid = $('dashboardVideosGrid');
  grid.innerHTML = '';
  
  if(!currentCreatorData || !currentCreatorData.videoUrls || !currentCreatorData.videoUrls.length){
    grid.innerHTML = '<div class="small">No videos yet</div>'; 
    return;
  }
  
  currentCreatorData.videoUrls.forEach((u, idx) => {
    const d = document.createElement('div');
    d.className = 'media-item';
    d.innerHTML = `<video src="${u}" controls style="width:100%;height:140px;object-fit:cover;border-radius:8px"></video>`;
    grid.appendChild(d);
  });
}

async function loadDashboardBanners() {
  if(!currentUser) return;
  
  try {
    const snap = await db.collection('banners')
      .where('creatorId', '==', currentUser.uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    const grid = $('dashboardBannersGrid');
    grid.innerHTML = '';
    
    if(snap.empty){
      grid.innerHTML = '<div class="small">No banners yet</div>';
      return;
    }
    
    snap.docs.forEach(doc => {
      const banner = { id: doc.id, ...doc.data() };
      const d = document.createElement('div');
      d.className = 'media-item';
      d.innerHTML = `
        <img src="${banner.imageUrl}" style="width:100%;height:120px;object-fit:cover;border-radius:8px">
        <div class="small" style="margin-top:8px">
          <div>Expires: ${new Date(banner.expiresAt).toLocaleDateString()}</div>
          <div>Status: ${banner.active ? 'Active' : 'Inactive'}</div>
          <button class="btn ghost" style="margin-top:4px; padding:4px 8px; font-size:12px" onclick="deleteBanner('${doc.id}')">Delete</button>
        </div>
      `;
      grid.appendChild(d);
    });
  } catch(err) {
    console.error('Error loading banners', err);
  }
}

/******************************
 * DELETE FUNCTIONS
 ******************************/
async function deleteBanner(bannerId){
  if(!confirm('Are you sure you want to delete this banner?')) return;
  
  try {
    showLoading('Deleting banner...');
    await db.collection('banners').doc(bannerId).delete();
    hideLoading();
    showAlert('Success', 'Banner deleted successfully!');
    loadDashboardBanners();
  } catch(err) {
    hideLoading();
    console.error('Error deleting banner', err);
    showAlert('Error', 'Delete failed: ' + err.message);
  }
}

/******************************
 * ACCOUNT FUNCTIONS
 ******************************/
function upgradeAccount() {
  if(!FLUTTERWAVE_PUBLIC_KEY){
    showAlert('Payment', 'Flutterwave key not configured. Please provide FLUTTERWAVE_PUBLIC_KEY in the script to enable payments.');
    return;
  }
  showAlert('Payment', 'Payment flow will open (you must configure FLUTTERWAVE_PUBLIC_KEY).');
}

function logoutCreator() {
  if(confirm('Are you sure you want to logout?')) {
    auth.signOut().then(() => {
      window.location.href = 'index.html';
    }).catch(e => {
      console.error('signout error', e);
      showAlert('Error', 'Logout failed: ' + e.message);
    });
  }
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
// Start the dashboard when page loads
window.addEventListener('load', initializeDashboard);
