// --- Get all the DOM elements ---
const imageLoader = document.getElementById('image-loader');
const canvas = document.getElementById('image-canvas');
const fakeCanvas = document.getElementById('fake-canvas');
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
const presetpastebin = document.getElementById('preset-pastebin');
const presetwykop = document.getElementById('preset-wykop');
const charCountDisplay = document.getElementById('charCount');


// --- Character maps ---
// Ramps. Index 0 maps to brightness 0 (black), N-1 maps to brightness 255 (white).
// 'negative' checkbox will reverse this.
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
    'custom': [' ', '▢', '▣', '▨', '▩'] // temp
}

negativeCheckbox.addEventListener('change', () => {
    // update the little text preview
    updateSymbolsPreview();
    // just re-run the whole thing
    convertImageToAscii();
});

// Updates the " . : - = + " preview text
function updateSymbolsPreview() {
    const selectedKey = symbolsMapSelect.value;

    // IMPORTANT: make a copy, don't change the original CHAR_MAPS
    let charArray = [...CHAR_MAPS[selectedKey]];

    // flip it if 'negative' is checked
    if (negativeCheckbox.checked) {
        charArray.reverse();
    }

    // just join with spaces for the preview text
    symbolsPreview.textContent = charArray.join(' ');
}

// run once on load to show the default
updateSymbolsPreview();

// global to hold the loaded image data
let loadedImage = null;

// --- Step 1: File Loader ---
// This just pre-loads the image into the `loadedImage` var.
imageLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
        return; // no file selected
    }

    const reader = new FileReader();

    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            console.log('Image pre-loaded.');

            // save it to the global var
            loadedImage = img;

            // now they can click the button
            generateButton.disabled = false;
        };
        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
});


// --- Step 2: Button Click ---
// This just kicks off the main function
generateButton.addEventListener('click', () => {
    convertImageToAscii();
});

// Show/hide the manual width slider
scaleModeSelect.addEventListener('change', () => {
    const mode = scaleModeSelect.value;
    
    // only enable the manual width slider/input if mode is 'manual'
    const isManual = (mode === 'manual');
    lineWidthInput.disabled = !isManual;
    lineWidthSlider.disabled = !isManual;

    // re-run if we have an image
    if (loadedImage) {
        convertImageToAscii();
    }
});

// --- Step 3: The Main Conversion Function ---
// This does all the real work.
function convertImageToAscii() {
    // safety check, don't run if no image
    if (!loadedImage) {
        // alert('Please upload an image first!'); // too annoying
        return;
    }

// --- SCALING LOGIC ---
    let newWidth, newHeight;
    const scaleMode = scaleModeSelect.value;

    if (scaleMode === 'pixel-perfect') {
        // 1-to-1 pixels
        newWidth = loadedImage.width;
        newHeight = loadedImage.height;
        console.log("Scaling: Pixel Perfect");

    } else if (scaleMode === 'auto') {
        // 'auto' = use a fixed width
        const MAX_WIDTH = 135; // my default
        const scaleFactor = loadedImage.width / MAX_WIDTH;
        newWidth = Math.floor(loadedImage.width / scaleFactor);
        newHeight = Math.floor(loadedImage.height / scaleFactor * verticalStretchSlider.value); // apply stretch
        console.log("Scaling: Auto");

    } else if (scaleMode === 'manual') {
        // 'manual' = read from slider
        let MAX_WIDTH = parseInt(lineWidthInput.value, 10); 
        if (isNaN(MAX_WIDTH) || MAX_WIDTH < 1) {
            MAX_WIDTH = 235; // fallback
        }

        const scaleFactor = loadedImage.width / MAX_WIDTH;
        newWidth = Math.floor(loadedImage.width / scaleFactor);
        newHeight = Math.floor(loadedImage.height / scaleFactor * verticalStretchSlider.value); // apply stretch
        console.log("Scaling: Manual");
    }

    // resize canvas to our new size
    canvas.width = newWidth;
    canvas.height = newHeight;

    // draw the image (scaled) onto the tiny canvas
    ctx.drawImage(loadedImage, 0, 0, newWidth, newHeight);
    console.log(`Image drawn to canvas at ${newWidth}x${newHeight}`);

    //draw the image to the fake canvas for preview
    fakeCanvas.width = loadedImage.width;
    fakeCanvas.height = loadedImage.height;
    const fctx = fakeCanvas.getContext('2d');
    fctx.drawImage(loadedImage, 0, 0, loadedImage.width, loadedImage.height);

    // --- PIXEL-TO-ASCII LOGIC ---

    // get the right ramp
    const selectedKey = symbolsMapSelect.value;

    // !! MUST make a copy, don't modify the original
    let charRamp = [...CHAR_MAPS[selectedKey]];

    // flip it if needed
    if (negativeCheckbox.checked) {
        charRamp.reverse();
    }

    const rampLength = charRamp.length;

    // pull all pixel data from the canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dataArray = imageData.data; // this is a flat [r,g,b,a, r,g,b,a, ...] array

    let asciiArt = ''; // build the string here

    // loop through 4 bytes at a time (r,g,b,a)
    for (let i = 0; i < dataArray.length; i += 4) {
        const r = dataArray[i];
        const g = dataArray[i + 1];
        const b = dataArray[i + 2];
        // simple average for brightness. could be fancier (luminosity) but this is fine
        const brightness = (r + g + b) / 3;

        // map brightness (0-255) to an index in our ramp (0-N)
        const charIndex = Math.floor((brightness / 256) * rampLength);

        // add the character to our string
        asciiArt += charRamp[charIndex];

        // check if we're at the end of a row
        const x = (i / 4) % canvas.width;
        if (x === canvas.width - 1) {
            asciiArt += '\n'; // add newline
        }
    }

    // Set the text content ONCE. 
    asciiOutput.textContent = asciiArt;
    console.log("ASCII Art Generated!");


    let charCount = newHeight * newWidth;
    console.log(`Character count: ${charCount}`);
    charCountDisplay.textContent = `Chars: ${charCount}`;
    
}



// --- All the other listeners ---

// Link line height slider and input
lineHeightSlider.addEventListener('input', () => {
    let lineHeight = lineHeightSlider.value;
    asciiOutput.style.lineHeight = lineHeight + 'px';
    lineHeightInput.value = lineHeight;
});
lineHeightInput.addEventListener('input', () => {
    let lineHeight = lineHeightInput.value;
    if (lineHeight < 1) lineHeight = 1; // min 1
    asciiOutput.style.lineHeight = lineHeight + 'px';
    lineHeightSlider.value = lineHeight;
});

// Link line *width* slider and input (and regen)
lineWidthSlider.addEventListener('input', () => {
    lineWidthInput.value = lineWidthSlider.value;
    convertImageToAscii(); // regen
});
lineWidthInput.addEventListener('input', () => {
    lineWidthSlider.value = lineWidthInput.value;
    convertImageToAscii(); // regen
});

// Link vertical stretch slider and input (and regen)
verticalStretchSlider.addEventListener('input', () => {
    let stretchValue = verticalStretchSlider.value;
    verticalStretchInput.value = stretchValue;
    convertImageToAscii(); // regen
});
verticalStretchInput.addEventListener('input', () => {
    let stretchValue = verticalStretchInput.value;
    verticalStretchSlider.value = stretchValue;
    convertImageToAscii(); // regen
});

// Symbol map dropdown
symbolsMapSelect.addEventListener('change', () => {
    // update the preview text
    updateSymbolsPreview();
    // regen
    convertImageToAscii();
}); 

presetpastebin.addEventListener('click', () => {
    asciiOutput.classList.toggle('pastebin-output');
    lineHeightInput.value = 21;
    lineHeightSlider.value = 21; 
    asciiOutput.style.lineHeight = '21px';
    stretchValue = 0.35;
    verticalStretchInput.value = stretchValue;
    verticalStretchSlider.value = stretchValue;
    scalemode = 'manual';
    scaleModeSelect.value = scalemode;
    maxWidth = 135;
    lineWidthInput.value = maxWidth;
    lineWidthSlider.value = maxWidth;
    convertImageToAscii();
});

presetwykop.addEventListener('click', () => {
    asciiOutput.classList.toggle('wykop-output');
    lineHeightInput.value = 20;
    lineHeightSlider.value = 20; 
    asciiOutput.style.lineHeight = '20px';
    stretchValue = 0.35;
    verticalStretchInput.value = stretchValue;
    verticalStretchSlider.value = stretchValue;
    scalemode = 'manual';
    scaleModeSelect.value = scalemode;
    maxWidth = 87;
    lineWidthSlider.disabled = false;
    lineWidthInput.disabled = false;    
    lineWidthInput.value = maxWidth;
    lineWidthSlider.value = maxWidth;
    convertImageToAscii();
});