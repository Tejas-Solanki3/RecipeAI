// Scroll animation handler
function handleScrollAnimation() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementBottom = element.getBoundingClientRect().bottom;
        const isVisible = (elementTop < window.innerHeight - 100) && (elementBottom > 0);
        
        if (isVisible) {
            element.classList.add('visible');
        }
    });
}

// Navbar scroll handler
function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

// Add scroll event listeners
window.addEventListener('scroll', () => {
    handleScrollAnimation();
    handleNavbarScroll();
});

// Initialize animations on load
window.addEventListener('load', () => {
    handleScrollAnimation();
    handleNavbarScroll();
});

// Recipe parsing function
function parseRecipe(recipeText) {
    console.log('Raw recipe text:', recipeText);
    
    if (!recipeText) {
        throw new Error('No recipe text provided');
    }

    const sections = {
        ingredients: [],
        instructions: [],
        hinglish: []
    };

    let currentSection = null;
    const lines = recipeText.split('\n').map(line => line.trim()).filter(line => line);

    for (let line of lines) {
        // Detect sections
        if (line.toLowerCase().includes('ingredients')) {
            currentSection = 'ingredients';
            continue;
        } else if (line.toLowerCase().includes('instructions') && !line.toLowerCase().includes('hinglish')) {
            currentSection = 'instructions';
            continue;
        } else if (line.toLowerCase().includes('hinglish')) {
            currentSection = 'hinglish';
            continue;
        }

        // Skip empty lines and section headers
        if (!line || line.toLowerCase().includes('important notes')) continue;

        // Process line based on current section
        if (currentSection === 'ingredients') {
            if (line.startsWith('-') || line.startsWith('•')) {
                sections.ingredients.push(line.replace(/^[-•]/, '').trim());
            }
        } else if (currentSection === 'instructions') {
            if (/^\d+\./.test(line)) {
                sections.instructions.push(line.replace(/^\d+\./, '').trim());
            }
        } else if (currentSection === 'hinglish') {
            if (/^\d+\./.test(line)) {
                sections.hinglish.push(line.replace(/^\d+\./, '').trim());
            }
        }
    }

    // Validate parsed content
    if (sections.ingredients.length === 0) {
        console.warn('No ingredients found in the recipe');
    }
    if (sections.instructions.length === 0) {
        console.warn('No instructions found in the recipe');
    }

    console.log('Parsed recipe sections:', sections);

    return {
        ingredients: sections.ingredients,
        instructions: sections.instructions,
        hinglish: sections.hinglish
    };
}

// Function to format ingredients
function formatIngredients(ingredients) {
    if (!ingredients || ingredients.length === 0) {
        return '<p class="no-content">No ingredients available</p>';
    }
    
    return ingredients
        .map(ingredient => `<div class="ingredient-item">
            <i class="fas fa-check-circle"></i>
            <span>${ingredient}</span>
        </div>`)
        .join('');
}

// Function to format instructions
function formatInstructions(instructions) {
    if (!instructions || instructions.length === 0) {
        return '<p class="no-content">No instructions available</p>';
    }
    
    return `
        <div class="instructions-container">
            <div class="audio-controls">
                <button class="btn-audio" id="toggleAudio">
                    <i class="fas fa-play"></i> Start Reading
                </button>
                <button class="btn-audio" id="pauseAudio">
                    <i class="fas fa-pause"></i> Pause
                </button>
                <div class="volume-control">
                    <i class="fas fa-volume-up"></i>
                    <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="1">
                </div>
            </div>
            <div class="steps-list">
                ${instructions.map((step, index) => `
                    <div class="instruction-step" data-step="${index}">
                        <label class="step-checkbox">
                            <input type="checkbox" class="step-complete" data-step="${index}">
                            <span class="checkmark"></span>
                        </label>
                        <div class="step-content">
                            <div class="step-number">${index + 1}</div>
                            <div class="step-text">${step}</div>
                        </div>
                        <button class="btn-step-audio" data-step="${index}">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Text to speech initialization
const synth = window.speechSynthesis;
let currentStep = 0;
let isReading = false;

// Function to speak text
function speakText(text, onEnd = () => {}) {
    if (synth.speaking) {
        synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1;
    utterance.volume = document.getElementById('volumeSlider').value;
    utterance.onend = onEnd;
    synth.speak(utterance);
}

// Function to read next step
function readNextStep() {
    const steps = document.querySelectorAll('.instruction-step');
    if (currentStep < steps.length) {
        const stepText = steps[currentStep].querySelector('.step-text').textContent;
        const checkbox = steps[currentStep].querySelector('.step-complete');
        
        // Highlight current step
        steps.forEach(step => step.classList.remove('current-step'));
        steps[currentStep].classList.add('current-step');
        
        speakText(`Step ${currentStep + 1}. ${stepText}`);
    } else {
        isReading = false;
        currentStep = 0;
        document.getElementById('toggleAudio').innerHTML = '<i class="fas fa-play"></i> Start Reading';
    }
}

// Initialize audio controls after recipe generation
function initializeAudioControls() {
    const toggleBtn = document.getElementById('toggleAudio');
    const pauseBtn = document.getElementById('pauseAudio');
    const volumeSlider = document.getElementById('volumeSlider');
    const stepCheckboxes = document.querySelectorAll('.step-complete');
    const stepAudioButtons = document.querySelectorAll('.btn-step-audio');

    // Toggle reading
    toggleBtn.addEventListener('click', () => {
        if (!isReading) {
            isReading = true;
            toggleBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Reading';
            readNextStep();
        } else {
            isReading = false;
            synth.cancel();
            toggleBtn.innerHTML = '<i class="fas fa-play"></i> Start Reading';
        }
    });

    // Pause/Resume
    pauseBtn.addEventListener('click', () => {
        if (synth.speaking) {
            if (synth.paused) {
                synth.resume();
                pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            } else {
                synth.pause();
                pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            }
        }
    });

    // Volume control
    volumeSlider.addEventListener('input', (e) => {
        if (synth.speaking) {
            synth.cancel();
            if (isReading) readNextStep();
        }
    });

    // Step checkboxes
    stepCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const step = parseInt(this.dataset.step);
            if (this.checked && step === currentStep) {
                currentStep++;
                if (isReading) {
                    setTimeout(readNextStep, 500); // Small delay before next step
                }
            }
        });
    });

    // Individual step audio buttons
    stepAudioButtons.forEach(button => {
        button.addEventListener('click', function() {
            const step = parseInt(this.dataset.step);
            const stepText = document.querySelector(`.instruction-step[data-step="${step}"] .step-text`).textContent;
            speakText(`Step ${step + 1}. ${stepText}`);
        });
    });
}

function getYoutubeVideoEmbed(dishName) {
    const searchQuery = encodeURIComponent(`${dishName} recipe how to cook`);
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    
    return `
        <div class="video-container fade-in">
            <div class="video-header">
                <i class="fab fa-youtube"></i>
                <h3>Watch How to Make It</h3>
            </div>
            <div class="video-content">
                <p>Watch step-by-step recipe videos for ${dishName}:</p>
                <a href="${youtubeSearchUrl}" target="_blank" rel="noopener noreferrer" class="youtube-link">
                    <i class="fab fa-youtube"></i> Watch Recipe Videos
                </a>
            </div>
        </div>
    `;
}

// Tab switching function
window.switchTab = function(btn, lang) {
    // Get all buttons and panes
    const buttons = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');
    
    // Remove active class from all buttons and panes
    buttons.forEach(b => b.classList.remove('active'));
    panes.forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    
    // Add active class to clicked button and corresponding pane
    btn.classList.add('active');
    const activePane = document.getElementById(lang);
    activePane.classList.add('active');
    activePane.style.display = 'block';
};

// Add a single event listener at the document level
document.addEventListener('change', function(event) {
    if (event.target.classList.contains('step-check')) {
        const stepEl = event.target.closest('.instruction-step');
        if (stepEl) {
            if (event.target.checked) {
                stepEl.classList.add('completed');
            } else {
                stepEl.classList.remove('completed');
            }
        }
    }
});

// API configuration
const BASE_URL = window.location.origin;

// Recipe form submission
document.getElementById('recipe-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    const dish = document.getElementById('dish').value.trim();
    
    if (!dish) {
        alert('Please tell us what you\'d like to cook!');
        return;
    }

    // Show loading state with dynamic messages
    const loadingMessages = [
        'Gathering ingredients from our magical pantry...',
        'Consulting with our AI chef...',
        'Perfecting the recipe just for you...',
        'Adding a sprinkle of culinary wisdom...',
        'Almost ready to create something delicious...'
    ];

    const loadingText = document.querySelector('.loading .main-text');
    let messageIndex = 0;

    const messageInterval = setInterval(() => {
        loadingText.textContent = loadingMessages[messageIndex];
        messageIndex = (messageIndex + 1) % loadingMessages.length;
    }, 3000);

    const loadingElement = document.getElementById('loading');
    const outputElement = document.getElementById('recipe-output');
    const existingVideo = outputElement.querySelector('.video-panel');
    
    // Remove existing video if present
    if (existingVideo) {
        existingVideo.remove();
    }

    // Show loading
    loadingElement.classList.add('visible');
    outputElement.classList.remove('visible');
    outputElement.classList.add('hidden');

    try {
        console.log('Sending request for dish:', dish);
        const response = await fetch('/api/generate-recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dish })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Parse the recipe
        const { ingredients, instructions, hinglish } = parseRecipe(data.recipe);
        
        // Update the UI with the recipe
        document.getElementById('ingredients-list').innerHTML = formatIngredients(ingredients);
        document.getElementById('english').innerHTML = formatInstructions(instructions);
        document.getElementById('hinglish').innerHTML = formatInstructions(hinglish);
        
        // Set recipe image
        if (data.image) {
            const recipeImage = document.querySelector('.recipe-image');
            recipeImage.src = data.image;
            recipeImage.style.display = 'block';
        }

        // Initialize audio controls
        setTimeout(initializeAudioControls, 100);

        // Get and embed YouTube video
        const videoEmbed = await getYoutubeVideoEmbed(dish);
        if (videoEmbed) {
            const videoPanel = document.createElement('div');
            videoPanel.className = 'video-panel';
            videoPanel.innerHTML = videoEmbed;
            outputElement.appendChild(videoPanel);
        }

        // Hide loading and show output
        loadingElement.classList.remove('visible');
        outputElement.classList.remove('hidden');
        outputElement.classList.add('visible');

        // Clear loading message interval
        clearInterval(messageInterval);

    } catch (error) {
        console.error('Error:', error);
        
        // Hide loading
        loadingElement.classList.remove('visible');
        
        // Show error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = error.message || 'Failed to generate recipe. Please try again.';
        
        // Remove any existing error messages
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        document.body.appendChild(errorMessage);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
        
        // Clear loading message interval
        clearInterval(messageInterval);
    }
});

// Contact form handling
document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    e.target.reset();
});

// Modal handling
const loginBtn = document.querySelector('.login-btn');
const registerBtn = document.querySelector('.register-btn');
const premiumBtn = document.querySelector('.premium-btn');
const closeButtons = document.querySelectorAll('.close');
const modals = document.querySelectorAll('.modal');

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

loginBtn.addEventListener('click', () => openModal('loginModal'));
registerBtn.addEventListener('click', () => openModal('registerModal'));
premiumBtn.addEventListener('click', () => openModal('premiumModal'));

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        closeModal(modal);
    });
});

window.addEventListener('click', (e) => {
    modals.forEach(modal => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
});

// Form handling
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    // Add login logic here
    alert('Login functionality will be implemented soon!');
    closeModal(document.getElementById('loginModal'));
});

document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    // Add registration logic here
    alert('Registration functionality will be implemented soon!');
    closeModal(document.getElementById('registerModal'));
});

// Add smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Remove the previous event listener since we're using a different approach
document.removeEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('step-check')) {
        const stepEl = e.target.closest('.instruction-step');
        if (stepEl) {
            if (e.target.checked) {
                stepEl.classList.add('completed');
            } else {
                stepEl.classList.remove('completed');
            }
        }
    }
});

// Equipment handling
document.getElementById('updateRecipe').addEventListener('click', async function() {
    const equipmentList = Array.from(document.querySelectorAll('input[name="equipment"]:checked'))
        .map(input => input.value);
    
    // Get the current recipe text from both ingredients and instructions
    const ingredients = document.querySelector('.ingredients-list').textContent;
    const instructions = document.querySelector('.instructions-english').textContent;
    const recipeText = `Ingredients:\n${ingredients}\n\nInstructions:\n${instructions}`;
    
    try {
        // Show loading state
        const updateBtn = document.getElementById('updateRecipe');
        const originalText = updateBtn.innerHTML;
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        updateBtn.disabled = true;

        const apiUrl = window.location.origin + '/api/update-recipe';
        console.log('Making request to:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify({
                recipe: recipeText,
                equipment: equipmentList
            })
        });

        if (!response.ok) {
            if (response.status === 403) {
                openModal('premiumModal');
                return;
            }
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        
        // Update the instructions with the new recipe steps
        const instructionsContainer = document.querySelector('.instructions-english');
        instructionsContainer.innerHTML = formatInstructions(data.instructions);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Recipe updated based on your equipment!';
        document.querySelector('.equipment-section').appendChild(successMessage);
        
        // Remove success message after 3 seconds
        setTimeout(() => {
            successMessage.remove();
        }, 3000);

    } catch (error) {
        console.error('Error:', error);
        // Show error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to update recipe. Please try again.';
        document.querySelector('.equipment-section').appendChild(errorMessage);
        
        // Remove error message after 3 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 3000);
    } finally {
        // Restore button state
        const updateBtn = document.getElementById('updateRecipe');
        updateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Recipe';
        updateBtn.disabled = false;
    }
});

// Add styles for success and error messages
const style = document.createElement('style');
style.textContent = `
    .success-message, .error-message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 8px;
        animation: slideIn 0.3s ease-out;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .success-message {
        background: #4CAF50;
        color: white;
    }
    
    .error-message {
        background: #f44336;
        color: white;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
