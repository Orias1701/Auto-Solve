const currentUrl = window.location.href.split('&')[0];
const storageKey = `dynamicAnswers_adverb_${currentUrl}`;
let dynamicAnswers = JSON.parse(localStorage.getItem(storageKey)) || {};

async function autoFillAdverb() {
    // Check circleNext status first
    const circleNext = document.getElementById('circleNext');
    if (circleNext) {
        if (!circleNext.classList.contains('hide')) {
            if (circleNext.classList.contains('blinker')) {
                // Wait for blinker to disappear
                await new Promise(resolve => {
                    const observer = new MutationObserver((mutations) => {
                        if (!circleNext.classList.contains('blinker')) {
                            observer.disconnect();
                            resolve();
                        }
                    });
                    observer.observe(circleNext, { attributes: true, attributeFilter: ['class'] });
                });
                // Click circleNext after blinker disappears
                circleNext.click();
                // Wait briefly before continuing
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            // Return to avoid filling while circleNext is visible
            setTimeout(autoFillAdverb, 50);
            return;
        }
    }

    // Find current question
    const qBoxes = document.querySelectorAll('.qBox');
    let currentQid = 0;
    let found = false;
    qBoxes.forEach((box) => {
        if (!box.classList.contains('hide')) {
            currentQid = parseInt(box.getAttribute('qid'));
            found = true;
        }
    });

    // Check if finished
    if (!found) {
        localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        console.log(`Hoàn thành nhập trạng từ! ${storageKey}:`, dynamicAnswers);
        const nextPlayButton = document.getElementById('nextPlayButton');
        if (nextPlayButton && !nextPlayButton.classList.contains('hide')) {
            nextPlayButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.error('nextPlayButton not found or hidden');
        }
        return;
    }

    // Find input element
    const inputElement = document.getElementById(`input-${currentQid}`);
    if (!inputElement) {
        console.error(`Input element input-${currentQid} not found`);
        return;
    }

    let answer = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        // Prioritize storage answer
        if (dynamicAnswers[currentQid]) {
            answer = dynamicAnswers[currentQid];
            console.log(`Thử đáp án từ storage cho qid ${currentQid}: ${answer}`);
        } else {
            // Try qText
            const qText = document.getElementById(`qText-${currentQid}`);
            if (qText) {
                const text = qText.textContent.trim();
                const startIdx = text.indexOf('. ') + 2;
                let endIdx = text.indexOf(' -');
                if (endIdx === -1) endIdx = text.length;
                if (startIdx >= 2) {
                    answer = text.substring(startIdx, endIdx).trim();
                    console.log(`Thử đáp án từ qText cho qid ${currentQid}: ${answer}`);
                }
            } else {
                // Fallback to 'wrong'
                answer = 'wrong';
                console.log(`Thử với 'wrong' cho qid ${currentQid}`);
            }
        }

        // Fill answer
        inputElement.value = answer;

        // Click Next button
        const nextButton = document.getElementById('nextButton');
        if (nextButton && !nextButton.disabled) {
            nextButton.click();
        } else {
            console.error('Next button not found or disabled');
            setTimeout(autoFillAdverb, 50);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 20));

        // Check hint
        const hintElement = document.getElementById(`aHint-${currentQid}`);
        const warningSpan = hintElement ? hintElement.querySelector('span.warning') : null;

        if (warningSpan) {
            // Get answer from warning
            answer = warningSpan.textContent.trim();
            dynamicAnswers[currentQid] = answer;
            console.log(`Lấy đáp án từ warning cho qid ${currentQid}: ${answer}`);
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        } else {
            // Correct answer
            dynamicAnswers[currentQid] = answer;
            console.log(`Đáp án đúng cho qid ${currentQid}: ${answer}`);
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            break;
        }

        attempts++;
    }

    if (attempts >= maxAttempts) {
        console.error(`Đã thử ${maxAttempts} lần cho qid ${currentQid} mà không có warning hoặc đáp án đúng`);
        return;
    }

    // Fill answer
    inputElement.value = answer;

    // Click Next button
    const nextButton = document.getElementById('nextButton');
    if (nextButton && !nextButton.disabled) {
        nextButton.click();
    } else {
        console.error('Next button not found or disabled');
        setTimeout(autoFillAdverb, 50);
        return;
    }

    // Continue after 50ms
    setTimeout(autoFillAdverb, 50);
}

// Start
autoFillAdverb();

// Reset function
function resetDynamicAnswers() {
    localStorage.removeItem(storageKey);
}