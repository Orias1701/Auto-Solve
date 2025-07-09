const currentUrl = window.location.href.split('&')[0];
const storageKey = `dynamicAnswers_matching_${currentUrl}`;

async function autoSolveMatching() {
    // Check if eGuide is visible and click Play button if present
    const eGuide = document.getElementById('eGuide');
    if (eGuide && !eGuide.classList.contains('hide')) {
        const playButton = document.getElementById('playButton');
        if (playButton) {
            console.log('eGuide is visible. Clicking Play button.');
            playButton.click();
            await new Promise(resolve => setTimeout(resolve, 50));
        } else {
            console.error('Play button not found in eGuide.');
        }
        setTimeout(autoSolveMatching, 50);
        return;
    }

    // Check if nextPlayButton is visible (indicating quiz completion)
    const nextPlayButton = document.getElementById('nextPlayButton');
    if (nextPlayButton && !nextPlayButton.classList.contains('hide')) {
        console.log('Quiz completed! Clicking nextPlayButton.');
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

    // If no question is found, exit
    if (!found) {
        console.log('No active question found.');
        return;
    }

    // Get all mb (Vietnamese) elements in column 2
    const mbElements = currentQBox.querySelectorAll(`.matching.mb`);
    if (!mbElements.length) {
        console.error(`No mb elements found for qid ${currentQid}`);
        return;
    }

    // Iterate through mb elements
    for (let i = 0; i < mbElements.length; i++) {
        const mbElement = mbElements[i];
        const mbGroup = mbElement.getAttribute('group');
        const mbId = mbElement.getAttribute('id');

        console.log(`Checking mb element: ${mbId} (group ${mbGroup})`);

        // Find corresponding ma element with same group
        const maElement = currentQBox.querySelector(`.matching.ma[group="${mbGroup}"]`);
        if (!maElement) {
            console.error(`No ma element found for group ${mbGroup}`);
            continue;
        }

        const maId = maElement.getAttribute('id');
        console.log(`Found matching ma element: ${maId} (group ${mbGroup})`);

        // Select ma then mb
        maElement.click();
        await new Promise(resolve => setTimeout(resolve, 50));
        mbElement.click();
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Check if nextButton is visible
    const nextButton = document.getElementById('nextButton');
    if (nextButton && !nextButton.classList.contains('hide')) {
        console.log('All matches completed. Clicking nextButton.');
        nextButton.click();
    } else {
        console.log('Waiting for nextButton to become visible or question to change.');
    }

    // Continue to next question
    setTimeout(autoSolveMatching, 50);
}

// Start the matching solver
autoSolveMatching();