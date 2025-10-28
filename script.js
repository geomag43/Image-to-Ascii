const imageLoader = document.getElementById('image-loader');
const canvas = document.getElementById('image-canvas');
const ctx = canvas.getContext('2d');
const asciiOutput = document.getElementById('ascii-output');
const generateButton = document.getElementById('generate-button');
const scaleModeSelect = document.getElementById('scale-mode');
const symbolsMapSelect = document.getElementById('symbols-map-select');
const symbolsPreview = document.getElementById('symbols-preview');
const lineHeightSlider = document.getElementById('line-height-slider');
const lineHeightInput = document.getElementById('line-height-input');
const verticalStretchSlider = document.getElementById('vertical-stretch-slider');
const verticalStretchInput = document.getElementById('vertical-stretch-input');
const negativeCheckbox = document.getElementById('negative-checkbox');
const lineWidthSlider = document.getElementById('line-width-slider');
const lineWidthInput = document.getElementById('line-width-input');


// Ramps go from Least (index 0) to Most obstructive (index N-1)
const CHAR_MAPS = {
    '1': [' ', '.'],
    '2': [' ', '.', '#'],
    '4': [' ', '.', '.', '|', '#'],
    '8': [' ', '.', ':', '-', '=', '+', '*', '#'],
    '16': [' ', '.', ':', '-', '=', '+', '*', 'W', 'M', '8', 'B', 'Q', '$', '%', '#', '@'],
    'letters': [' ', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'],
    'numbers': [' ', '1', '7', '2', '3', '4', '5', '6', '0', '8', '9'],
    'dots': [' ', '_', ':', ';', '-', '.', '|', '=', '+'],
    'blocks': [' ', '░', '▒', '▓', '█'],
    'blocks-alternate': [' ', '▝', '▅', '▚', '▙', '▉'],
    'custom': [' ', '▢', '▣', '▨', '▩'] // Placeholder
}

negativeCheckbox.addEventListener('change', () => {
    // Update the preview
    updateSymbolsPreview();
    
    // Also regenerate the art
    convertImageToAscii();
});

// Run it once on page load to set the initial preview
function updateSymbolsPreview() {
    const selectedKey = symbolsMapSelect.value;

    // Create a NEW COPY of the array
    let charArray = [...CHAR_MAPS[selectedKey]];

    // Check the box and reverse the COPY if needed
    if (negativeCheckbox.checked) {
        charArray.reverse();
    }

    // Join the copy and set the preview
    symbolsPreview.textContent = charArray.join(' ');
}

// This variable will hold our image so the button's function can access it
let loadedImage = null;

// --- Step 1: File Loader ---
// This listener just pre-loads the image.
imageLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            console.log('Image pre-loaded. Ready to generate.');

            // We just save the image. Conversion happens on button click.
            loadedImage = img;

            // Enable the button now that an image is loaded
            generateButton.disabled = false;
        };
        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
});


// --- Step 2: Button Click ---
// This listener runs the conversion when the button is clicked.
generateButton.addEventListener('click', () => {
    // Call our new conversion function
    convertImageToAscii();
});

scaleModeSelect.addEventListener('change', () => {
    const mode = scaleModeSelect.value;
    
    if (mode === 'manual') {
        lineWidthInput.disabled = false;
        lineWidthSlider.disabled = false;
    } else {
        lineWidthInput.disabled = true;
        lineWidthSlider.disabled = true;
    }

    // Optional: Regenerate if an image is already loaded
    if (loadedImage) {
        convertImageToAscii();
    }
});
// --- Step 3: The Conversion Function ---
// All your existing logic moves into this function.
function convertImageToAscii() {
    // Check if an image has been loaded first
    if (!loadedImage) {
        alert('Please upload an image first!');
        return;
    }

// --- SCALING LOGIC ---
    let newWidth, newHeight;
    const scaleMode = scaleModeSelect.value;

    if (scaleMode === 'pixel-perfect') {
        newWidth = loadedImage.width;
        newHeight = loadedImage.height;
        console.log("Scaling: Pixel Perfect");

    } else if (scaleMode === 'auto') {
        // 'auto' mode uses a fixed default width
        const MAX_WIDTH = 135; // Use a fixed default
        const scaleFactor = loadedImage.width / MAX_WIDTH;
        newWidth = Math.floor(loadedImage.width / scaleFactor);
        newHeight = Math.floor(loadedImage.height / scaleFactor * verticalStretchSlider.value);
        console.log("Scaling: Auto");

    } else if (scaleMode === 'manual') {
        // 'manual' mode reads from the (now-enabled) inputs
        let MAX_WIDTH = parseInt(lineWidthInput.value, 10); 
        if (isNaN(MAX_WIDTH) || MAX_WIDTH < 1) {
            MAX_WIDTH = 235; // Fallback to a default
        }

        const scaleFactor = loadedImage.width / MAX_WIDTH;
        newWidth = Math.floor(loadedImage.width / scaleFactor);
        newHeight = Math.floor(loadedImage.height / scaleFactor * verticalStretchSlider.value);
        console.log("Scaling: Manual");
    }

    // Set canvas to the new calculated size
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Draw the scaled image
    ctx.drawImage(loadedImage, 0, 0, newWidth, newHeight);
    console.log(`Image scaled and drawn to canvas at ${newWidth}x${newHeight}`);

    // --- PIXEL-TO-ASCII LOGIC ---

    // Get the selected character ramp
    const selectedKey = symbolsMapSelect.value;

    // Create a COPY of the ramp
    let charRamp = [...CHAR_MAPS[selectedKey]];

    // Reverse the ramp if 'negative' is checked
    if (negativeCheckbox.checked) {
        charRamp.reverse();
    }

    const rampLength = charRamp.length;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dataArray = imageData.data;

    let asciiArt = '';

    for (let i = 0; i < dataArray.length; i += 4) {
        const r = dataArray[i];
        const g = dataArray[i + 1];
        const b = dataArray[i + 2];
        const brightness = (r + g + b) / 3;

        const charIndex = Math.floor((brightness / 256) * rampLength);

        asciiArt += charRamp[charIndex];

        // Add newline at the end of a row
        const x = (i / 4) % canvas.width;
        if (x === canvas.width - 1) {
            asciiArt += '\n';
        }
    }

    // Set the text content ONCE
    asciiOutput.textContent = asciiArt;
    console.log("ASCII Art Generated!");
}

lineHeightSlider.addEventListener('input', () => {
    let lineHeight = lineHeightSlider.value;
    asciiOutput.style.lineHeight = lineHeight + 'px';
    lineHeightInput.value = lineHeight;
});

lineHeightInput.addEventListener('input', () => {
    let lineHeight = lineHeightInput.value;
    if (lineHeight < 1) lineHeight = 1;
    asciiOutput.style.lineHeight = lineHeight + 'px';
    lineHeightSlider.value = lineHeight;
});

lineWidthSlider.addEventListener('input', () => {
    // Update the input field to match the slider
     lineWidthInput.value = lineWidthSlider.value;
    // Regenerate the ASCII art
    convertImageToAscii();
});

lineWidthInput.addEventListener('input', () => {
    // Update the slider to match the input field
     lineWidthSlider.value = lineWidthInput.value;
    // Regenerate the ASCII art
    convertImageToAscii();
});

verticalStretchSlider.addEventListener('input', () => {
    let stretchValue = verticalStretchSlider.value;
    verticalStretchInput.value = stretchValue;
    convertImageToAscii();
});

verticalStretchInput.addEventListener('input', () => {
    let stretchValue = verticalStretchInput.value;
    // Update the slider to match the input
    verticalStretchSlider.value = stretchValue;
    // Regenerate the ASCII art
    convertImageToAscii();

});

symbolsMapSelect.addEventListener('change', () => {
    // Update the preview text (e.g., ". : - = + * #")
    updateSymbolsPreview();
    
    // Regenerate the ASCII art with the new symbols
    // This function will automatically check if an image is loaded
    convertImageToAscii();
});



