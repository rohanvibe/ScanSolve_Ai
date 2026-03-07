// Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const targetOverlay = document.getElementById('target-overlay');
const cropBox = document.getElementById('crop-box');
const cameraBtn = document.getElementById('camera-btn');
const captureBtn = document.getElementById('capture-btn');
const loadingIndicator = document.getElementById('loading-indicator');

const resultCard = document.getElementById('result-card');
const resultContent = document.getElementById('result-content');
const subjectBadge = document.getElementById('subject-badge');
const topicDisplay = document.getElementById('topic-display');

const actionCard = document.getElementById('action-card');
const actionTitle = document.getElementById('action-title');
const actionContent = document.getElementById('action-content');

const quizInteractive = document.getElementById('quiz-interactive');
const quizAnswerInput = document.getElementById('quiz-answer');
const submitQuizBtn = document.getElementById('submit-quiz-btn');
const quizFeedback = document.getElementById('quiz-feedback');

const chatCard = document.getElementById('chat-card');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

const weakAreasList = document.getElementById('weak-areas-list');

const xpFill = document.getElementById('xp-fill');
const xpText = document.getElementById('xp-text');
const levelDisplay = document.getElementById('level-display');

const teacherToggle = document.getElementById('teacher-mode-toggle');
const multipleToggle = document.getElementById('multiple-questions-toggle');

let stream = null;
let isCameraOpen = false;

// State
let currentSolution = "";
let currentTopic = "";
let chatHistory = [];
let quizCorrectLetter = "";

// Gamification & Tracking init
let xp = parseInt(localStorage.getItem('scansolve_xp') || '0');
let level = parseInt(localStorage.getItem('scansolve_level') || '1');
let topicsDb = JSON.parse(localStorage.getItem('scansolve_topics') || '{}');

function updateGamificationDisplay() {
    // Basic level logic: every 100 XP is a level
    const calculatedLevel = Math.floor(xp / 100) + 1;
    if (calculatedLevel > level) {
        level = calculatedLevel;
        localStorage.setItem('scansolve_level', level);
    }

    let rank = "Beginner";
    if (level >= 5) rank = "Solver";
    if (level >= 10) rank = "Math Ninja";
    if (level >= 20) rank = "Problem Master";

    levelDisplay.textContent = `Lvl ${level} (${rank})`;
    xpText.textContent = `${xp} XP`;
    let fill = (xp % 100) + "%";
    xpFill.style.width = fill;
}

function addXP(amount) {
    xp += amount;
    localStorage.setItem('scansolve_xp', xp);
    updateGamificationDisplay();
}

function trackTopic(topicStr, success = true) {
    if (!topicStr || topicStr === "Unknown" || topicStr === "General topic") return;
    if (!topicsDb[topicStr]) topicsDb[topicStr] = { attempts: 0, correct: 0 };
    topicsDb[topicStr].attempts += 1;
    if (success) topicsDb[topicStr].correct += 1;
    localStorage.setItem('scansolve_topics', JSON.stringify(topicsDb));
    updateWeakAreas();
}

function updateWeakAreas() {
    weakAreasList.innerHTML = '';
    const topicsArr = Object.keys(topicsDb).map(k => {
        let acc = topicsDb[k].correct / topicsDb[k].attempts;
        return { name: k, acc: acc, val: topicsDb[k] };
    });
    // sort by lowest accuracy
    topicsArr.sort((a, b) => a.acc - b.acc);

    if (topicsArr.length === 0) {
        weakAreasList.innerHTML = '<li class="text-gray-400 italic">No topics analyzed yet.</li>';
        return;
    }

    topicsArr.slice(0, 5).forEach(t => {
        let li = document.createElement('li');
        li.className = "flex justify-between items-center bg-gray-50 p-2 rounded";
        let pct = Math.round(t.acc * 100);
        let color = pct < 50 ? 'text-red-500' : 'text-green-600';
        li.innerHTML = `<span class="font-semibold">${t.name}</span> <span class="${color} font-bold">${pct}% Acc (${t.val.correct}/${t.val.attempts})</span>`;
        weakAreasList.appendChild(li);
    });
}

function formatMarkdown(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

updateGamificationDisplay();
updateWeakAreas();

multipleToggle.addEventListener('change', () => {
    if (multipleToggle.checked) {
        // Expand the crop box to the whole page essentially
        cropBox.className = "absolute inset-0 border-4 border-dashed border-blue-400 bg-transparent z-10 box-border";
        cropBox.innerHTML = '<span class="absolute top-2 left-1/2 transform -translate-x-1/2 text-white text-md font-bold drop-shadow-lg">Capture Full Page</span>';
    } else {
        cropBox.className = "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 h-1/2 border-2 border-dashed border-blue-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] bg-transparent z-10 box-border";
        cropBox.innerHTML = '<span class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-white text-xs font-semibold whitespace-nowrap drop-shadow-md">Place question here</span>';
    }
});

cameraBtn.addEventListener('click', async () => {
    if (!isCameraOpen) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            video.srcObject = stream;
            video.classList.remove('hidden');
            cameraPlaceholder.classList.add('hidden');
            targetOverlay.classList.remove('hidden');
            captureBtn.classList.remove('hidden');
            cameraBtn.textContent = 'Close Camera';
            cameraBtn.classList.replace('bg-gray-800', 'bg-red-500');
            isCameraOpen = true;
            resultCard.classList.add('hidden');
            actionCard.classList.add('hidden');
            chatCard.classList.add('hidden');
            video.play();
        } catch (err) {
            console.error(err);
            alert("Camera access denied.");
        }
    } else {
        if (stream) stream.getTracks().forEach(track => track.stop());
        video.classList.add('hidden');
        cameraPlaceholder.classList.remove('hidden');
        targetOverlay.classList.add('hidden');
        captureBtn.classList.add('hidden');
        cameraBtn.textContent = 'Open Camera';
        cameraBtn.classList.replace('bg-red-500', 'bg-gray-800');
        isCameraOpen = false;
    }
});

captureBtn.addEventListener('click', async () => {
    video.pause();

    let cropWidth, cropHeight, cropX, cropY;
    const vW = video.videoWidth;
    const vH = video.videoHeight;

    if (multipleToggle.checked) {
        cropWidth = vW; cropHeight = vH; cropX = 0; cropY = 0;
    } else {
        cropWidth = vW * 0.8; cropHeight = vH * 0.5;
        cropX = (vW - cropWidth) / 2; cropY = (vH - cropHeight) / 2;
    }

    const scale = Math.min(1000 / cropWidth, 1);
    canvas.width = cropWidth * scale;
    canvas.height = cropHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.6);

    // Reset UI
    loadingIndicator.classList.remove('hidden');
    loadingIndicator.classList.add('flex');
    resultCard.classList.add('hidden');
    actionCard.classList.add('hidden');
    chatCard.classList.add('hidden');
    captureBtn.disabled = true;

    try {
        const response = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: base64Image,
                teacherMode: teacherToggle.checked,
                multiple: multipleToggle.checked
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        currentSolution = data.result;
        currentTopic = data.topic;

        subjectBadge.textContent = data.subject || "Math";
        topicDisplay.textContent = `Topic: ${data.topic || "Unknown"}`;
        resultContent.innerHTML = formatMarkdown(currentSolution);

        resultCard.classList.remove('hidden');
        chatCard.classList.remove('hidden');
        chatCard.classList.add('flex');
        chatHistory = []; // resets chat

        // Gamification
        addXP(10);
        trackTopic(currentTopic, true); // initial scan attempt tracked

    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        loadingIndicator.classList.add('hidden');
        loadingIndicator.classList.remove('flex');
        captureBtn.disabled = false;
    }
});

// Action buttons (Explain, Practice, Quiz)
async function performAction(action, modeStr = "") {
    actionCard.classList.remove('hidden');
    actionTitle.textContent = `Generating ${action}...`;
    actionContent.innerHTML = "<i>Loading...</i>";
    quizInteractive.classList.add('hidden');

    try {
        const res = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action,
                question: "Extracted from image",
                solution: currentSolution,
                topic: currentTopic,
                mode: modeStr
            })
        });
        const data = await res.json();
        actionContent.innerHTML = formatMarkdown(data.result);

        if (action === 'explain') actionTitle.textContent = "Explanation";
        if (action === 'practice') { actionTitle.textContent = "Practice Questions"; addXP(10); } // bonus for opening practice
        if (action === 'quiz') {
            actionTitle.textContent = "Quick Quiz";
            quizInteractive.classList.remove('hidden');
            quizFeedback.textContent = "";
            quizAnswerInput.value = "";

            // extract correct answer from the AI result loosely.
            const match = data.result.match(/Correct Answer:\s*([A-D])/i);
            if (match) {
                quizCorrectLetter = match[1].toUpperCase();
                // Hide it from the user interface
                actionContent.innerHTML = formatMarkdown(data.result.replace(/Correct Answer:.*(\n.*)?/ig, ''));
            }
        }
    } catch (e) {
        actionContent.innerHTML = `<span class="text-red-500">Error: ${e.message}</span>`;
    }
}

document.querySelectorAll('.action-explain').forEach(btn => {
    btn.addEventListener('click', () => performAction('explain', btn.getAttribute('data-mode')));
});

document.getElementById('btn-practice').addEventListener('click', () => performAction('practice'));
document.getElementById('btn-quiz').addEventListener('click', () => performAction('quiz'));

submitQuizBtn.addEventListener('click', () => {
    const ans = quizAnswerInput.value.trim().toUpperCase();
    if (ans === quizCorrectLetter) {
        quizFeedback.textContent = "Correct!";
        quizFeedback.className = "text-green-600 font-bold mt-2";
        addXP(15);
        trackTopic(currentTopic, true);
    } else {
        quizFeedback.textContent = "Incorrect. The correct answer was " + quizCorrectLetter;
        quizFeedback.className = "text-red-500 font-bold mt-2";
        trackTopic(currentTopic, false);
    }
});

chatSend.addEventListener('click', async () => {
    const msg = chatInput.value.trim();
    if (!msg) return;

    // add user msg
    chatWindow.innerHTML += `<div class="bg-blue-100 p-2 rounded text-right self-end max-w-[80%]"><strong>You:</strong> ${msg}</div>`;
    chatInput.value = "";
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        const res = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'chat',
                solution: currentSolution,
                topic: currentTopic,
                message: msg,
                history: chatHistory
            })
        });
        const data = await res.json();
        chatHistory.push({ role: "User", content: msg });
        chatHistory.push({ role: "Tutor", content: data.result });

        chatWindow.innerHTML += `<div class="bg-gray-200 p-2 rounded text-left self-start max-w-[80%]"><strong>Tutor:</strong> ${formatMarkdown(data.result)}</div>`;
        chatWindow.scrollTop = chatWindow.scrollHeight;
    } catch (e) {
        console.error(e);
    }
});
