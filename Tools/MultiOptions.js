const currentUrl = window.location.href.split('&')[0];
const storageKey = `dynamicAnswers_quiz_${currentUrl}`;
let dynamicAnswers = JSON.parse(localStorage.getItem(storageKey)) || {};

async function autoSolveQuiz() {
    // Check if eGiude is visible and click Play button if present
    const eGiude = document.getElementById('eGiude');
    if (eGiude && !eGiude.classList.contains('hide')) {
        const playButton = document.getElementById('playButton');
        if (playButton) {
            console.log('eGiude is visible. Clicking Play button.');
            playButton.click();
            await new Promise(resolve => setTimeout(resolve, 50));
        } else {
            console.error('Play button not found in eGiude.');
        }
        setTimeout(autoSolveQuiz, 50);
        return;
    }

    // Check if nextPlayButton is visible (indicating quiz completion)
    const nextPlayButton = document.getElementById('nextPlayButton');
    if (nextPlayButton && !nextPlayButton.classList.contains('hide')) {
        console.log('Quiz completed! Saving answers and clicking nextPlayButton.');
        localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        nextPlayButton.click();
        return;
    }

    // Find current question
    const qBoxes = document.querySelectorAll('.qBox');
    let currentQid = 0;
    let currentQBox = null;
    let found = false;

    qBoxes.forEach((box) => {
        if (!box.classList.contains('hide')) {
            currentQid = parseInt(box.getAttribute('qid'));
            currentQBox = box;
            found = true;
        }
    });

    // If no question is found, save and exit
    if (!found) {
        console.log(`No active question found. Saving answers: ${storageKey}`, dynamicAnswers);
        localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        return;
    }

    // Get answer options
    const options = currentQBox.querySelectorAll(`.option-${currentQid}`);
    if (!options.length) {
        console.error(`No options found for qid ${currentQid}`);
        return;
    }

    // Check if answer is already in storage
    if (dynamicAnswers[currentQid]) {
        console.log(`Using stored answer for qid ${currentQid}: ${dynamicAnswers[currentQid]}`);
        const storedOption = currentQBox.querySelector(`.option-${currentQid}[choose="${dynamicAnswers[currentQid]}"]`);
        if (storedOption) {
            storedOption.click();
            await new Promise(resolve => setTimeout(resolve, 50));

            const nextButton = document.getElementById('nextButton');
            if (nextButton && !nextButton.classList.contains('hide')) {
                nextButton.click();
            }
            setTimeout(autoSolveQuiz, 50);
            return;
        }
    }

    // Try each option
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const chooseValue = option.getAttribute('choose');

        console.log(`Trying option ${chooseValue} for qid ${currentQid}`);
        option.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Check if nextButton is visible (correct answer)
        const nextButton = document.getElementById('nextButton');
        if (nextButton && !nextButton.classList.contains('hide')) {
            console.log(`Correct answer found for qid ${currentQid}: ${chooseValue}`);
            dynamicAnswers[currentQid] = chooseValue;
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            nextButton.click();
            break;
        }

        // Check if question changed (auto-jump to next question)
        let stillActive = false;
        qBoxes.forEach((box) => {
            if (box.getAttribute('qid') === currentQid.toString() && !box.classList.contains('hide')) {
                stillActive = true;
            }
        });

        if (!stillActive) {
            console.log(`Question changed. Saving answer for qid ${currentQid}: ${chooseValue}`);
            dynamicAnswers[currentQid] = chooseValue;
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            break;
        }
    }

    // Continue to next question
    setTimeout(autoSolveQuiz, 50);
}

// Reset function
function resetDynamicAnswers() {
    localStorage.removeItem(storageKey);
    console.log(`Cleared storage for ${storageKey}`);
}

// Start the quiz solver
autoSolveQuiz();