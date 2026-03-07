const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const targetOverlay = document.getElementById('target-overlay');
const cameraBtn = document.getElementById('camera-btn');
const captureBtn = document.getElementById('capture-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const resultCard = document.getElementById('result-card');
const resultContent = document.getElementById('result-content');

let stream = null;
let isCameraOpen = false;

function formatResult(text) {
    let formattedText = text;
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return formattedText;
}

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
            cameraBtn.classList.replace('hover:bg-gray-900', 'hover:bg-red-600');
            isCameraOpen = true;

            resultCard.classList.add('hidden');

            // Play video normally if it was paused
            video.play();

        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please make sure you have given permissions.");
        }
    } else {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        video.classList.add('hidden');
        cameraPlaceholder.classList.remove('hidden');
        targetOverlay.classList.add('hidden');
        captureBtn.classList.add('hidden');

        cameraBtn.textContent = 'Open Camera';
        cameraBtn.classList.replace('bg-red-500', 'bg-gray-800');
        cameraBtn.classList.replace('hover:bg-red-600', 'hover:bg-gray-900');
        isCameraOpen = false;
    }
});

captureBtn.addEventListener('click', async () => {
    // 1. Instantly pause video so user can move camera away immediately
    video.pause();

    // 2. Calculate cropping dimensions (80% width, 50% height, centered)
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    const cropWidth = videoWidth * 0.8;
    const cropHeight = videoHeight * 0.5;
    const cropX = (videoWidth - cropWidth) / 2;
    const cropY = (videoHeight - cropHeight) / 2;

    // Set canvas to cropped dimensions keeping it reasonable (e.g., max width 1000px)
    const scale = Math.min(1000 / cropWidth, 1);
    canvas.width = cropWidth * scale;
    canvas.height = cropHeight * scale;

    const ctx = canvas.getContext('2d');

    // Draw only the cropped portion, scaling it down if necessary
    ctx.drawImage(
        video,
        cropX, cropY, cropWidth, cropHeight, // Source coords
        0, 0, canvas.width, canvas.height // Dest coords
    );

    // Compress to JPEG with medium quality
    const base64Image = canvas.toDataURL('image/jpeg', 0.6);

    captureBtn.disabled = true;
    captureBtn.classList.add('opacity-50', 'cursor-not-allowed');
    loadingIndicator.classList.remove('hidden');
    loadingIndicator.classList.add('flex');
    resultCard.classList.add('hidden');
    resultContent.innerHTML = '';

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

        resultContent.innerHTML = formatResult(data.result);
        resultCard.classList.remove('hidden');

    } catch (error) {
        console.error("Error solving problem:", error);
        alert("Failed to solve the problem: " + error.message);
    } finally {
        captureBtn.disabled = false;
        captureBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        loadingIndicator.classList.add('hidden');
        loadingIndicator.classList.remove('flex');

        // After loading finishes, we could either automatically close camera or let them keep looking at the paused frame.
        // It's requested they don't have to hold it, and pause() resolves that.
    }
});
