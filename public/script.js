const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const cameraBtn = document.getElementById('camera-btn');
const captureBtn = document.getElementById('capture-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const resultCard = document.getElementById('result-card');
const resultContent = document.getElementById('result-content');

let stream = null;
let isCameraOpen = false;

// Format the AI text for better readability (bold titles etc)
function formatResult(text) {
    let formattedText = text;
    // Replace markdown stars with bold tags if they happen to appear
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return formattedText;
}

cameraBtn.addEventListener('click', async () => {
    if (!isCameraOpen) {
        try {
            // Request environment camera for mobile by default
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            video.srcObject = stream;

            // Update UI
            video.classList.remove('hidden');
            cameraPlaceholder.classList.add('hidden');
            captureBtn.classList.remove('hidden');

            cameraBtn.textContent = 'Close Camera';
            cameraBtn.classList.replace('bg-gray-800', 'bg-red-500');
            cameraBtn.classList.replace('hover:bg-gray-900', 'hover:bg-red-600');
            isCameraOpen = true;

            // Hide previous results when opening camera
            resultCard.classList.add('hidden');

        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please make sure you have given permissions.");
        }
    } else {
        // Stop stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Update UI
        video.classList.add('hidden');
        cameraPlaceholder.classList.remove('hidden');
        captureBtn.classList.add('hidden');

        cameraBtn.textContent = 'Open Camera';
        cameraBtn.classList.replace('bg-red-500', 'bg-gray-800');
        cameraBtn.classList.replace('hover:bg-red-600', 'hover:bg-gray-900');
        isCameraOpen = false;
    }
});

captureBtn.addEventListener('click', async () => {
    // Take a snapshot
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas image to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    // UI states: disable button, show loading
    captureBtn.disabled = true;
    captureBtn.classList.add('opacity-50', 'cursor-not-allowed');
    loadingIndicator.classList.remove('hidden');
    loadingIndicator.classList.add('flex');
    resultCard.classList.add('hidden');
    resultContent.innerHTML = ''; // reset previous

    try {
        const response = await fetch('/api/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: base64Image })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Server returned an error');
        }

        // Populate result
        resultContent.innerHTML = formatResult(data.result);
        resultCard.classList.remove('hidden');

        // Optionally close camera after successful capture
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        video.classList.add('hidden');
        cameraPlaceholder.classList.remove('hidden');
        captureBtn.classList.add('hidden');
        cameraBtn.textContent = 'Open Camera';
        cameraBtn.classList.replace('bg-red-500', 'bg-gray-800');
        cameraBtn.classList.replace('hover:bg-red-600', 'hover:bg-gray-900');
        isCameraOpen = false;

    } catch (error) {
        console.error("Error solving problem:", error);
        alert("Failed to solve the problem: " + error.message);
    } finally {
        captureBtn.disabled = false;
        captureBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        loadingIndicator.classList.add('hidden');
        loadingIndicator.classList.remove('flex');
    }
});
