 const allChallenges = [
    { id: 1, q: "Academic Pressure: Best way to reset?", opt1: "20-min Power Nap", opt2: "Listening to Lo-Fi", cat: "Mental", insight: "Power naps reset cognitive function. Over 70% of board students report feeling overwhelmed weekly." },
    { id: 2, q: "Physical Health: Break the Cycle!", opt1: "Stretch Now", opt2: "A Short Walk", cat: "Physical", insight: "Combatting a sedentary lifestyle improves focus for intense board exam prep." },
    { id: 3, q: "Stress Management: Exam Tomorrow?", opt1: "Plan Your Task", opt2: "5-min Meditation", cat: "Mental", insight: "Actionable planning and mindfulness reduce high-stakes exam anxiety." },
    { id: 4, q: "Digital Fatigue: Too much screen time?", opt1: "20-20-20 Rule", opt2: "Blue Light Filter", cat: "Physical", insight: "Looking 20 feet away for 20 seconds every 20 minutes prevents eye strain." },
    { id: 5, q: "Sleep Deprivation: Feeling groggy?", opt1: "Consistent Bedtime", opt2: "Quick Coffee", cat: "Mental", insight: "A consistent sleep schedule improves long-term cognitive function and mood." },
    { id: 6, q: "Social Isolation: Feeling disconnected?", opt1: "Call a Friend", opt2: "Scroll Social Media", cat: "Mental", insight: "Meaningful, active social connections significantly reduce stress levels." },
    { id: 7, q: "Dietary Choices: Mid-day slump?", opt1: "Handful of Nuts", opt2: "Sugary Energy Drink", cat: "Physical", insight: "Protein and healthy fats provide sustained energy without the sugar crash." },
    { id: 8, q: "Test Anxiety: Heart racing?", opt1: "Deep Breathing", opt2: "Review Notes Again", cat: "Mental", insight: "Deep breathing activates the parasympathetic nervous system, calming the body instantly." },
    { id: 9, q: "Posture Problems: Back hurting?", opt1: "Core Exercises", opt2: "Adjust Posture", cat: "Physical", insight: "Strengthening core muscles provides better long-term support for your spine." },
    { id: 10, q: "Burnout: Zero motivation?", opt1: "Take a Break", opt2: "Push Through", cat: "Mental", insight: "Taking a complete break prevents chronic burnout and actually restores productivity." },
    { id: 11, q: "Hydration: Feeling sluggish?", opt1: "Drink Water", opt2: "Drink Soda", cat: "Physical", insight: "Mild dehydration is a leading cause of afternoon fatigue and brain fog." },
    { id: 12, q: "Focus Issues: Can't concentrate?", opt1: "Pomodoro Technique", opt2: "Multitasking", cat: "Mental", insight: "The Pomodoro technique builds focus stamina and prevents cognitive overload." }
];

// IMPORTANT: Replace this with your production backend URL (e.g., https://gsfc-wellness.onrender.com)
// If testing locally, use http://127.0.0.1:5000
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:5000' 
    : 'https://game-tm.onrender.com'; 

// Replace this with your actual Google Client ID from Google Cloud Console
// const GOOGLE_CLIENT_ID = "NOT_REQUIRED_FOR_EMAIL_LOGIN";

/**
 * Helper to check if email belongs to GSFC University domain.
 */
function isGSFCEmail(email) {
    return email.toLowerCase().endsWith('@gsfcuniversity.ac.in');
}


let currentSessionChallenges = [];
let currentIdx = 0;
let totalScore = 0;
let mentalScore = 0;
let physicalScore = 0;

const wellnessTips = [
    "Hydration is key! Aim for 8 glasses of water today.",
    "Take a 5-minute screen break every hour to rest your eyes.",
    "A 10-minute morning walk can boost your mood for the entire day.",
    "Practice 4-7-8 breathing when feeling overwhelmed.",
    "Ensure you get at least 7 hours of sleep tonight for better cognitive function."
];

// ─── TAB NAVIGATION ─────────────────────────────────────────────────────────
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => {
        if (n.innerText.toLowerCase().includes(pageId) || (pageId === 'home' && n.innerText.includes('Dashboard'))) {
            n.classList.add('active');
        }
    });
}

// ─── AUTH TAB SWITCHER ───────────────────────────────────────────────────────
function switchTab(tab) {
    const loginPanel  = document.getElementById('panel-login');
    const signupPanel = document.getElementById('panel-signup');
    const tabLogin    = document.getElementById('tab-login');
    const tabSignup   = document.getElementById('tab-signup');

    clearMsg('login-msg');
    clearMsg('signup-msg');

    if (tab === 'login') {
        loginPanel.classList.remove('hidden-panel');
        loginPanel.classList.add('active-panel');
        signupPanel.classList.remove('active-panel');
        signupPanel.classList.add('hidden-panel');
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
    } else {
        signupPanel.classList.remove('hidden-panel');
        signupPanel.classList.add('active-panel');
        loginPanel.classList.remove('active-panel');
        loginPanel.classList.add('hidden-panel');
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
    }
}

// ─── MESSAGE HELPERS ─────────────────────────────────────────────────────────
function showMsg(id, text, type) {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = `auth-msg ${type}`;
}
function clearMsg(id) {
    const el = document.getElementById(id);
    el.textContent = '';
    el.className = 'auth-msg hidden';
}

// ─── PASSWORD VISIBILITY TOGGLE ──────────────────────────────────────────────
function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// ─── LOGIN IDENTIFIER VALIDATOR ─────────────────────────────────────────────
function isValidLoginId(id) {
    id = id.trim();
    if (id.includes('@')) {
        return id.toLowerCase().endsWith('@gsfcuniversity.ac.in');
    }
    // Allow enrollment IDs (alphanumeric, e.g., 25BCA047)
    return id.length >= 5 && /^[a-zA-Z0-9]+$/.test(id);
}

// ─── SIGN UP ─────────────────────────────────────────────────────────────────
function signupUser() {
    const name       = document.getElementById('signup-name').value.trim();
    const email      = document.getElementById('signup-email').value.trim().toLowerCase();
    const enrollment = document.getElementById('signup-enrollment').value.trim().toUpperCase();
    const password   = document.getElementById('signup-password').value;

    // Client-side validations
    if (!name || !email || !enrollment || !password) {
        return showMsg('signup-msg', 'Please fill in all fields.', 'error');
    }
    if (!isGSFCEmail(email)) {
        return showMsg('signup-msg', 'Only @gsfcuniversity.ac.in emails are allowed.', 'error');
    }
    if (password.length < 6) {
        return showMsg('signup-msg', 'Password must be at least 6 characters.', 'error');
    }

    const btn = document.getElementById('signup-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

    fetch(`${BACKEND_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, enrollment, password })
    })
    .then(res => res.json())
    .then(data => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> CREATE ACCOUNT';

        if (data.status === 'error') {
            return showMsg('signup-msg', data.message, 'error');
        }
        showMsg('signup-msg', '✅ Account created! Redirecting to login...', 'success');
        setTimeout(() => switchTab('login'), 1800);
    })
    .catch(err => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> CREATE ACCOUNT';
        console.error("Signup error:", err);
        showMsg('signup-msg', '⚠️ Connection failed. Check BACKEND_URL in script.js', 'error');
    });
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function loginUser() {
    const email    = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        return showMsg('login-msg', 'Please enter your email and password.', 'error');
    }
    if (!isValidLoginId(email)) {
        return showMsg('login-msg', 'Please enter a valid GSFC email or Enrollment ID.', 'error');
    }

    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

    fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-shield-alt"></i> SECURE ACCESS';

        if (data.status === 'error') {
            return showMsg('login-msg', data.message, 'error');
        }

        // Save session
        localStorage.setItem('nexusEmail',      data.email);
        localStorage.setItem('nexusUser',        data.name);
        localStorage.setItem('nexusEnrollment',  data.enrollment);
        localStorage.setItem('nexusCourse',      data.course);
        localStorage.setItem('nexusPlayedIds',   JSON.stringify(data.played_ids));

        totalScore    = data.total_score;
        mentalScore   = data.mental_score;
        physicalScore = data.physical_score;

        initDashboard(data.name, data.course);
    })
    .catch(err => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-shield-alt"></i> SECURE ACCESS';
        console.error("Login error:", err);
        showMsg('login-msg', '⚠️ Connection failed. Check BACKEND_URL in script.js', 'error');
    });
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem('nexusEmail');
    localStorage.removeItem('nexusUser');
    localStorage.removeItem('nexusEnrollment');
    localStorage.removeItem('nexusCourse');
    localStorage.removeItem('nexusPlayedIds');
    location.reload();
}

// ─── INIT DASHBOARD ───────────────────────────────────────────────────────────
function initDashboard(name, course) {
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('user-display').innerText = name;
    document.getElementById('welcome-name').innerText  = name;
    if (course) {
        document.getElementById('welcome-course').innerText = `📚 ${course}`;
    }
    updateAnalytics();
}

function updateAnalytics() {
    document.getElementById('dash-score').innerText = totalScore;
    const mHeight = Math.min(100, Math.max(10, mentalScore));
    const pHeight = Math.min(100, Math.max(10, physicalScore));
    document.getElementById('stat-mental-bar').style.height   = mHeight + '%';
    document.getElementById('stat-mental-bar').innerHTML      = `<span>${mentalScore}</span>`;
    document.getElementById('stat-physical-bar').style.height = pHeight + '%';
    document.getElementById('stat-physical-bar').innerHTML    = `<span>${physicalScore}</span>`;
}

// ─── ON LOAD ──────────────────────────────────────────────────────────────────
window.onload = () => {
    // googleSignInit(); // Removed for email login

    // Tip of the day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    document.getElementById('tip-of-day').innerText = wellnessTips[dayOfYear % wellnessTips.length];

    const savedEmail = localStorage.getItem('nexusEmail');
    const savedUser  = localStorage.getItem('nexusUser');
    const savedCourse = localStorage.getItem('nexusCourse');

    if (savedEmail && savedUser) {
        // Re-fetch from backend to get fresh scores
        // Note: For Google session, we'd normally verify the token again, but here we use a simple check
        fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: savedEmail, _session: true })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                totalScore    = data.total_score;
                mentalScore   = data.mental_score;
                physicalScore = data.physical_score;
                localStorage.setItem('nexusPlayedIds', JSON.stringify(data.played_ids));
                initDashboard(data.name, data.course);
            } else {
                logout();
            }
        })
        .catch(() => {
            initDashboard(savedUser, savedCourse);
        });
    } else {
        document.getElementById('auth-overlay').classList.remove('hidden');
    }
};

// ─── GAME LOGIC ───────────────────────────────────────────────────────────────
function launchGame() {
    currentIdx = 0;
    let playedIds = JSON.parse(localStorage.getItem('nexusPlayedIds') || '[]');
    let available = allChallenges.filter(c => !playedIds.includes(c.id));

    if (available.length < 5) {
        playedIds = [];
        available = [...allChallenges];
    }

    available.sort(() => Math.random() - 0.5);
    currentSessionChallenges = available.slice(0, 5);
    currentSessionChallenges.forEach(c => playedIds.push(c.id));
    localStorage.setItem('nexusPlayedIds', JSON.stringify(playedIds));

    document.getElementById('game-overlay').classList.remove('hidden');
    document.getElementById('total-step').innerText = currentSessionChallenges.length;
    loadQuestion();
}

function closeGame() {
    document.getElementById('game-overlay').classList.add('hidden');
}

function loadQuestion() {
    const q = currentSessionChallenges[currentIdx];
    document.getElementById('q-text').innerText        = q.q;
    document.getElementById('opt1').innerText          = q.opt1;
    document.getElementById('opt2').innerText          = q.opt2;
    document.getElementById('current-step').innerText  = currentIdx + 1;
    const progressPct = (currentIdx / currentSessionChallenges.length) * 100;
    document.getElementById('game-progress').style.width = progressPct + '%';
    document.getElementById('insight-panel').classList.add('hidden');
}

function handleAnswer() {
    const q = currentSessionChallenges[currentIdx];
    totalScore += 20;
    if (q.cat === 'Mental')   mentalScore   += 20;
    if (q.cat === 'Physical') physicalScore += 20;
    document.getElementById('insight-text').innerText = q.insight;
    document.getElementById('insight-panel').classList.remove('hidden');
}

document.getElementById('opt1').onclick = handleAnswer;
document.getElementById('opt2').onclick = handleAnswer;

document.getElementById('next-btn').onclick = () => {
    currentIdx++;
    if (currentIdx < currentSessionChallenges.length) {
        loadQuestion();
    } else {
        document.getElementById('game-progress').style.width = '100%';

        const savedEmail  = localStorage.getItem('nexusEmail');
        const playedIds   = JSON.parse(localStorage.getItem('nexusPlayedIds') || '[]');

        fetch(`${BACKEND_URL}/api/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: savedEmail,
                total_score: totalScore,
                mental_score: mentalScore,
                physical_score: physicalScore,
                played_ids: playedIds
            })
        }).then(() => {
            updateAnalytics();
            alert("✅ Check-in complete! Your analytics have been updated and securely saved.");
            closeGame();
        }).catch(() => {
            updateAnalytics();
            alert("✅ Check-in complete! (Saved locally — backend not connected)");
            closeGame();
        });
    }
};