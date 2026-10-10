const API_BASE = 'https://trailmate-2xn4.onrender.com';
// ===== TrailMate — Frontend Logic =====

// Weather code → emoji mapping
const WEATHER_EMOJI = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌧️', 55: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '❄️',
    80: '🌦️', 81: '🌧️', 82: '⛈️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
};

// ----- Utility Functions -----

function getLocation() {
    return document.getElementById('location').value.trim();
}

function getInterests() {
    const checked = document.querySelectorAll('.interest-input:checked');
    return Array.from(checked).map(cb => cb.value);
}

function getFitnessLevel() {
    return document.getElementById('fitness').value;
}

function showLoading(text = 'Gemma is planning your adventure...') {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('loading-text').textContent = text;
    document.getElementById('btn-adventures').disabled = true;
    document.getElementById('btn-challenge').disabled = true;
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('btn-adventures').disabled = false;
    document.getElementById('btn-challenge').disabled = false;
}

function showError(message) {
    const el = document.getElementById('error-message');
    el.innerHTML = `<strong>Oops!</strong> ${message}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 8000);
}

function hideError() {
    document.getElementById('error-message').classList.add('hidden');
}

function validate() {
    const location = getLocation();
    if (!location) {
        showError('Please enter a location to get started.');
        return false;
    }
    return true;
}

// ----- Weather -----

function renderWeather(weather, locationName) {
    const section = document.getElementById('weather-section');
    const current = weather.current || weather;

    const temp = current.temperature_2m;
    const code = current.weather_code;
    const humidity = current.relative_humidity_2m;
    const wind = current.wind_speed_10m;
    const description = current.weather_description || 'N/A';

    document.getElementById('weather-emoji').textContent = WEATHER_EMOJI[code] || '🌡️';
    document.getElementById('weather-location').textContent = locationName;
    document.getElementById('weather-temp').textContent = `${temp}°C`;
    document.getElementById('weather-condition').textContent = description;
    document.getElementById('weather-humidity').textContent = `${humidity}%`;
    document.getElementById('weather-wind').textContent = `${wind} km/h`;

    section.classList.remove('hidden');
}

// ----- Adventure Cards -----

function getDifficultyBadgeClass(difficulty) {
    const d = (difficulty || '').toLowerCase();
    if (d.includes('easy') || d.includes('relax') || d.includes('beginner')) return 'badge-difficulty-easy';
    if (d.includes('challeng') || d.includes('hard') || d.includes('strenuous')) return 'badge-difficulty-challenging';
    return 'badge-difficulty-moderate';
}

function renderAdventureCard(adventure, index) {
    const card = document.createElement('div');
    card.className = 'adventure-card fade-in-up';
    card.style.opacity = '0';

    const diffClass = getDifficultyBadgeClass(adventure.difficulty);

    card.innerHTML = `
        <h3 class="text-lg font-bold text-forest-800 mb-1">${adventure.title}</h3>
        <p class="text-sm text-forest-600 font-semibold mb-3 flex items-center gap-1"><span>📍</span> ${adventure.specific_destination || 'Local Nature Spot'}</p>
        <p class="text-gray-600 text-sm mb-4 leading-relaxed">${adventure.description}</p>
        <div class="flex flex-wrap gap-2 mb-4">
            <span class="badge badge-duration">⏱️ ${adventure.duration}</span>
            <span class="badge ${diffClass}">📊 ${adventure.difficulty}</span>
        </div>
        
        <div class="flex flex-wrap gap-2 mb-4 border-b border-green-100 pb-4">
            <button onclick="playTTS(this, 'Listen to this adventure: ${adventure.title}. ${adventure.description}')" class="text-sm bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors">
                <span class="text-lg">🔊</span> Listen
            </button>
            <button onclick="saveAdventure(this, '${adventure.title.replace(/'/g, "\\'")}', '${adventure.description.replace(/'/g, "\\'")}', '${adventure.duration}', '${adventure.difficulty}')" class="text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors">
                <span class="text-lg">💾</span> Save Trail
            </button>
            <button onclick="addToCalendar('${adventure.title.replace(/'/g, "\\'")}', '${adventure.description.replace(/'/g, "\\'")}', '${(adventure.specific_destination || '').replace(/'/g, "\\'")}', '${adventure.duration}')" class="text-sm bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors">
                <span class="text-lg">📅</span> Calendar
            </button>
        </div>

        <div class="space-y-1 mb-4">
            ${makeExpandable('🗺️ Quick Itinerary', adventure.itinerary, `itin-${index}`)}
            ${makeExpandable('🎒 What to Bring', adventure.what_to_bring, `bring-${index}`)}
            ${makeExpandable('🌿 Why Go Outside', adventure.why_outside, `why-${index}`)}
        </div>

        <button onclick="generateRoadmap('${adventure.title.replace(/'/g, "\\'")}', '${(adventure.specific_destination || '').replace(/'/g, "\\'")}')" class="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors shadow-sm">
            <span class="text-xl">🗺️</span> View Deep-Dive Roadmap
        </button>
    `;

    return card;
}

function makeExpandable(title, content, id) {
    if (!content) return '';
    // Handle arrays and strings
    const text = Array.isArray(content) ? content.map(i => `• ${i}`).join('<br>') : content;
    return `
        <div>
            <div class="expandable-header" onclick="toggleSection('${id}', this)">
                <span>${title}</span>
                <span class="arrow">▼</span>
            </div>
            <div class="expandable-content" id="${id}">
                <p class="text-sm text-gray-600 leading-relaxed">${text}</p>
            </div>
        </div>
    `;
}

function toggleSection(id, headerEl) {
    const content = document.getElementById(id);
    if (!content) return;
    content.classList.toggle('open');
    headerEl.classList.toggle('open');
}

// ----- Challenge Card -----

function renderChallengeCard(challenge) {
    const card = document.createElement('div');
    card.className = 'challenge-card fade-in-up';
    card.style.opacity = '0';

    card.innerHTML = `
        <h3 class="text-2xl font-bold text-earth-800 mb-1">⚡ ${challenge.title}</h3>
        <p class="text-earth-600 font-semibold mb-3 flex items-center gap-1"><span>📍</span> ${challenge.specific_destination || 'Local Nature Spot'}</p>
        <p class="text-earth-700 mb-4 leading-relaxed text-lg">${challenge.description}</p>
        <div class="flex flex-wrap gap-3 mb-4">
            <span class="badge badge-duration text-base px-4 py-1">⏱️ ${challenge.duration}</span>
        </div>
        ${challenge.tip ? `
            <div class="bg-white/60 rounded-xl p-4 mt-4 border border-earth-200">
                <p class="text-sm text-earth-700">
                    <strong>💡 Pro Tip:</strong> ${challenge.tip}
                </p>
            </div>
        ` : ''}
    `;

    return card;
}

// ----- API Calls -----

async function getAdventures() {
    hideError();
    if (!validate()) return;

    const location = getLocation();
    const interests = getInterests();
    const fitness_level = getFitnessLevel();

    if (interests.length === 0) {
        showError('Please select at least one interest to personalize your adventures.');
        return;
    }

    showLoading('🌿 Gemma is crafting your outdoor adventures...');

    try {
        const response = await fetch(API_BASE + '/api/adventures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location, interests, fitness_level })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Server error (${response.status})`);
        }

        const data = await response.json();

        // Render weather from the response
        if (data.weather) {
            renderWeatherFromAdventure(data.weather, data.location, data.coordinates);
        }

        // Render adventure cards
        const grid = document.getElementById('adventures-grid');
        grid.innerHTML = '';

        const adventures = data.adventures || [];
        adventures.forEach((adv, i) => {
            grid.appendChild(renderAdventureCard(adv, i));
        });

        document.getElementById('adventures-section').classList.remove('hidden');
        document.getElementById('challenge-section').classList.add('hidden');

        // Smooth scroll to results
        setTimeout(() => {
            document.getElementById('adventures-section').scrollIntoView({
                behavior: 'smooth', block: 'start'
            });
        }, 200);

    } catch (err) {
        showError(err.message || 'Failed to generate adventures. Please try again.');
    } finally {
        hideLoading();
    }
}

async function getDailyChallenge() {
    hideError();
    if (!validate()) return;

    const location = getLocation();

    showLoading('⚡ Generating your Touch Grass challenge...');

    try {
        const response = await fetch(API_BASE + '/api/challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Server error (${response.status})`);
        }

        const data = await response.json();

        // Render weather
        if (data.weather) {
            renderWeatherFromAdventure(data.weather, data.location, data.coordinates);
        }

        // Render challenge card
        const container = document.getElementById('challenge-card');
        container.innerHTML = '';
        container.appendChild(renderChallengeCard(data.challenge));

        document.getElementById('challenge-section').classList.remove('hidden');
        document.getElementById('adventures-section').classList.add('hidden');

        // Smooth scroll
        setTimeout(() => {
            document.getElementById('challenge-section').scrollIntoView({
                behavior: 'smooth', block: 'start'
            });
        }, 200);

    } catch (err) {
        showError(err.message || 'Failed to generate challenge. Please try again.');
    } finally {
        hideLoading();
    }
}

// Render weather from the simplified adventure/challenge response
function renderWeatherFromAdventure(weather, locationName, coords) {
    const section = document.getElementById('weather-section');
    document.getElementById('weather-location').textContent = locationName;
    document.getElementById('weather-temp').textContent = `${weather.temperature}°C`;
    document.getElementById('weather-condition').textContent = weather.condition;
    section.classList.remove('hidden');
}

// ----- Keyboard Support -----

document.addEventListener('DOMContentLoaded', () => {
    const locationInput = document.getElementById('location');
    locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            getAdventures();
        }
    });
});

// ----- ElevenLabs TTS & MongoDB Save Logic -----

async function playTTS(button, text) {
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="loading-dots inline-flex mr-1"><span></span><span></span><span></span></span> Loading...';
    button.disabled = true;

    try {
        const response = await fetch(API_BASE + '/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            if (response.status === 500) throw new Error("ElevenLabs API Key not configured.");
            throw new Error("Failed to load audio");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.onended = () => {
            button.innerHTML = '<span class="text-lg">🔊</span> Listen Again';
            button.disabled = false;
        };

        button.innerHTML = '<span class="text-lg">🔊</span> Playing...';
        await audio.play();
    } catch (err) {
        showError(err.message);
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

async function saveAdventure(button, title, description, duration, difficulty) {
    const originalText = button.innerHTML;
    button.innerHTML = 'Saving...';
    button.disabled = true;

    try {
        const response = await fetch(API_BASE + '/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title, description, duration, difficulty,
                location: getLocation() || "Unknown Location"
            })
        });

        if (!response.ok) {
            if (response.status === 500) throw new Error("MongoDB not configured. Add MONGODB_URI to .env");
            throw new Error("Failed to save trail");
        }

        button.innerHTML = '<span class="text-lg">✅</span> Saved!';
        button.classList.replace('bg-blue-50', 'bg-green-100');
        button.classList.replace('text-blue-700', 'text-green-800');
    } catch (err) {
        showError(err.message);
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// ----- View Saved Trails Logic -----

async function viewSavedTrails() {
    hideError();
    showLoading('Fetching your saved trails...');
    
    try {
        const response = await fetch(API_BASE + '/api/saved');
        if (!response.ok) {
            if (response.status === 500) throw new Error("MongoDB not configured. Add MONGODB_URI to .env");
            throw new Error("Failed to fetch saved trails");
        }
        
        const trails = await response.json();
        
        const grid = document.getElementById('saved-trails-grid');
        grid.innerHTML = '';
        
        if (trails.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">No saved trails yet. Go find some adventures!</div>';
        } else {
            trails.forEach((trail, i) => {
                grid.appendChild(renderSavedTrailCard(trail, i));
            });
        }
        
        document.getElementById('weather-section').classList.add('hidden');
        document.getElementById('adventures-section').classList.add('hidden');
        document.getElementById('challenge-section').classList.add('hidden');
        document.getElementById('saved-trails-section').classList.remove('hidden');
        
        setTimeout(() => {
            document.getElementById('saved-trails-section').scrollIntoView({
                behavior: 'smooth', block: 'start'
            });
        }, 200);
        
    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

function renderSavedTrailCard(trail, index) {
    const card = document.createElement('div');
    card.className = 'adventure-card fade-in-up';
    card.style.opacity = '0';
    
    const diffClass = getDifficultyBadgeClass(trail.difficulty);
    const dateStr = trail.saved_at ? new Date(trail.saved_at).toLocaleDateString() : 'Recently';
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <h3 class="text-lg font-bold text-forest-800">${trail.title}</h3>
            <span class="text-xs text-gray-400 font-medium px-2 bg-gray-50 rounded">${dateStr}</span>
        </div>
        <p class="text-xs text-forest-600 font-semibold mb-2 flex items-center gap-1"><span>📍</span> ${trail.location}</p>
        <p class="text-gray-600 text-sm mb-4 leading-relaxed">${trail.description}</p>
        
        <div class="flex flex-wrap gap-2 mb-4 border-b border-gray-100 pb-4">
            <span class="badge badge-duration">⏱️ ${trail.duration}</span>
            <span class="badge ${diffClass}">📊 ${trail.difficulty}</span>
        </div>
        
        <div>
            <button onclick="playTTS(this, 'Listen to your saved adventure: ${trail.title}. ${trail.description}')" class="w-full text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <span class="text-lg">🔊</span> Play Audio Guide
            </button>
        </div>
    `;
    
    return card;
}

// ----- Map & Autocomplete Logic -----

// Autocomplete logic
document.addEventListener('DOMContentLoaded', () => {
    const locationInput = document.getElementById('location');
    const suggestionsBox = document.getElementById('location-suggestions');
    let debounceTimer;

    locationInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length < 3) {
            suggestionsBox.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5`);
                const data = await res.json();
                
                suggestionsBox.innerHTML = '';
                
                if (data.results && data.results.length > 0) {
                    data.results.forEach(place => {
                        const li = document.createElement('li');
                        li.className = 'px-4 py-3 hover:bg-green-50 cursor-pointer text-sm text-gray-700 flex flex-col transition-colors';
                        
                        const name = place.name;
                        const region = place.admin1 ? `${place.admin1}, ` : '';
                        const country = place.country || '';
                        
                        li.innerHTML = `<span class="font-bold text-forest-700">${name}</span><span class="text-xs text-gray-500">${region}${country}</span>`;
                        
                        li.addEventListener('click', () => {
                            locationInput.value = `${name}, ${country}`;
                            suggestionsBox.classList.add('hidden');
                        });
                        
                        suggestionsBox.appendChild(li);
                    });
                    suggestionsBox.classList.remove('hidden');
                } else {
                    suggestionsBox.classList.add('hidden');
                }
            } catch (err) {
                console.error("Autocomplete failed:", err);
            }
        }, 300); // 300ms debounce
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!locationInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });
});

// ----- Calendar Export Logic -----

function addToCalendar(title, description, location, durationStr) {
    // Schedule for tomorrow at 10:00 AM by default
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(10, 0, 0, 0);

    // Try to extract hours from the duration string (e.g. "2 hours" -> 2), default to 2 hours
    let hours = 2;
    if (durationStr && durationStr.toLowerCase().includes('hour')) {
        const match = durationStr.match(/(\d+(\.\d+)?)/);
        if (match) hours = parseFloat(match[0]);
    } else if (durationStr && durationStr.toLowerCase().includes('min')) {
        hours = 0.5; // If it's just minutes, block out 30 mins
    }
    
    const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);

    // Format dates for ICS specification (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    // Build the .ics file content
    const icsData = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TrailMate//Hacktoberfest 2026//EN",
        "BEGIN:VEVENT",
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:🌿 ${title}`,
        `DESCRIPTION:Your TrailMate Adventure!\\n\\n${description.replace(/\n/g, '\\n')}`,
        `LOCATION:${location}`,
        "END:VEVENT",
        "END:VCALENDAR"
    ].join('\r\n'); // ICS files require CRLF line endings

    // Create a blob and trigger download
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '-').toLowerCase()}.ics`);
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ----- Roadmap Logic -----

async function generateRoadmap(title, destination) {
    const modal = document.getElementById('roadmap-modal');
    const titleEl = document.getElementById('modal-title');
    const destEl = document.getElementById('modal-destination');
    const loadingEl = document.getElementById('modal-loading');
    const contentEl = document.getElementById('modal-content');
    
    // Reset and show modal
    titleEl.textContent = title;
    destEl.innerHTML = `📍 <span>${destination}</span>`;
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    modal.classList.remove('hidden');
    
    try {
        const response = await fetch(API_BASE + '/api/roadmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: getLocation() || "Unknown Location",
                title: title,
                destination: destination
            })
        });

        if (!response.ok) {
            throw new Error("Failed to generate roadmap.");
        }

        const data = await response.json();
        
        // Populate content
        document.getElementById('rm-where').textContent = data.where_to_go || "Directions unavailable.";
        
        const timelineEl = document.getElementById('rm-timeline');
        timelineEl.innerHTML = '';
        if (data.timeline && data.timeline.length > 0) {
            data.timeline.forEach((item, index) => {
                const isEven = index % 2 === 0;
                timelineEl.innerHTML += `
                    <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8 last:mb-0">
                        <div class="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-forest-500 text-white font-black shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            ${index + 1}
                        </div>
                        <div class="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative">
                            <div class="absolute top-5 -left-3 md:group-even:-left-3 md:group-odd:-right-3 md:group-odd:left-auto w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-white md:group-odd:border-l-8 md:group-odd:border-l-white md:group-odd:border-r-0 hidden md:block"></div>
                            <h4 class="font-black text-forest-800 mb-1 text-lg">${item.step}</h4>
                            <p class="text-gray-600 text-sm leading-relaxed font-medium">${item.details}</p>
                        </div>
                    </div>
                `;
            });
        }
        
        const tipsEl = document.getElementById('rm-tips');
        tipsEl.innerHTML = '';
        if (data.nature_tips && data.nature_tips.length > 0) {
            data.nature_tips.forEach(tip => {
                tipsEl.innerHTML += `
                <li class="bg-forest-700/50 p-4 rounded-2xl flex items-start gap-3">
                    <span class="text-2xl mt-1">✨</span>
                    <span class="font-medium text-green-50">${tip}</span>
                </li>`;
            });
        }
        
        document.getElementById('rm-pro').textContent = data.pro_tip || "Enjoy the outdoors!";
        
        // Show content
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');
        document.getElementById('btn-download-roadmap').classList.remove('hidden');
        
    } catch (err) {
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');
        contentEl.innerHTML = `<div class="text-center text-red-500 font-bold p-8">⚠️ ${err.message}</div>`;
    }
}

function closeRoadmap() {
    document.getElementById('roadmap-modal').classList.add('hidden');
    document.getElementById('btn-download-roadmap').classList.add('hidden');
}

function downloadRoadmap() {
    const title = document.getElementById('modal-title').textContent;
    const dest = document.getElementById('modal-destination').textContent.replace('📍 ', '').trim();
    const where = document.getElementById('rm-where').textContent;
    
    let timelineText = '';
    document.querySelectorAll('#rm-timeline h4').forEach((el, index) => {
        const desc = el.nextElementSibling.textContent;
        timelineText += `\nStep ${index + 1}: ${el.textContent}\n${desc}\n`;
    });
    
    let tipsText = '';
    document.querySelectorAll('#rm-tips li').forEach((el, index) => {
        tipsText += `\n${index + 1}. ${el.innerText.replace('✨', '').trim()}`;
    });
    
    const proTip = document.getElementById('rm-pro').textContent;
    
    const content = `========================================
🌿 ${title.toUpperCase()} 🌿
📍 ${dest}
========================================

🗺️ GETTING STARTED:
${where}

⏱️ TIMELINE:
${timelineText}
🌿 NATURE IMMERSION TIPS:
${tipsText}

💡 PRO TIP:
${proTip}

========================================
Generated by TrailMate 🌿
(Have fun out there!)
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Roadmap_${title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

