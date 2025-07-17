(function() {
  // Unified solver for multiple exercise types
  const currentUrl = window.location.href.split('&')[0];
  const storageKey = `dynamicAnswers_${currentUrl}`;
  let dynamicAnswers = JSON.parse(localStorage.getItem(storageKey)) || {};

  // Array of possible choices for multiple-choice questions
  const choices = ['A', 'B', 'C', 'D'];

  // Solver for multiple-choice questions
  async function solveMultipleChoice() {
    const qBoxes = document.querySelectorAll('.qBox:not(.hide)');
    if (!qBoxes.length) {
      console.log('No active questions found.');
      return false;
    }

    let allAnsweredAcceptably = true;
    const maxAttemptsPerQuestion = 5;

    // Process each visible question
    for (const qBox of qBoxes) {
      const qid = parseInt(qBox.getAttribute('qid'));
      const options = qBox.querySelectorAll(`.option-${qid}`);
      if (!options.length) {
        console.error(`No options found for qid ${qid}`);
        allAnsweredAcceptably = false;
        continue;
      }

      let attempts = 0;
      let selectedAnswer = dynamicAnswers[qid];
      let answerAcceptable = false;

      while (attempts < maxAttemptsPerQuestion && !answerAcceptable) {
        // Check stored answer
        if (selectedAnswer && choices.includes(selectedAnswer)) {
          console.log(`Using stored answer for qid ${qid}: ${selectedAnswer}`);
          const option = Array.from(options).find(opt => opt.getAttribute('choose') === selectedAnswer);
          if (option) {
            option.click();
            await new Promise(resolve => setTimeout(resolve, 50));
          } else {
            console.error(`Option ${selectedAnswer} not found for qid ${qid}`);
            allAnsweredAcceptably = false;
            break;
          }
        } else {
          // If no stored answer, try the next choice based on previous attempts
          const previousAnswer = dynamicAnswers[qid];
          const startIndex = previousAnswer ? choices.indexOf(previousAnswer) + 1 : 0;
          if (startIndex >= choices.length) {
            console.error(`No more choices to try for qid ${qid}`);
            allAnsweredAcceptably = false;
            break;
          }

          const choice = choices[startIndex];
          console.log(`Trying choice ${choice} for qid ${qid}`);
          const option = Array.from(options).find(opt => opt.getAttribute('choose') === choice);
          if (option) {
            option.click();
            selectedAnswer = choice;
            dynamicAnswers[qid] = choice;
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            await new Promise(resolve => setTimeout(resolve, 50));
          } else {
            console.error(`Option ${choice} not found for qid ${qid}`);
            allAnsweredAcceptably = false;
            break;
          }
        }

        // Check if the selected answer is acceptable (no class containing "danger")
        const selectedOption = Array.from(options).find(opt => opt.getAttribute('choose') === selectedAnswer);
        const hintElement = document.getElementById(`aWrong-${qid}`) || document.getElementById(`aHint-${qid}`);
        const hasDangerClass = selectedOption && Array.from(selectedOption.classList).some(cls => cls.includes('danger'));
        if (hasDangerClass || (hintElement && hintElement.textContent.trim())) {
          console.log(`Wrong answer for qid ${qid}: ${selectedAnswer} (has danger class or hint)`);
          attempts++;
          if (attempts < maxAttemptsPerQuestion) {
            const currentIndex = choices.indexOf(selectedAnswer);
            if (currentIndex + 1 < choices.length) {
              selectedAnswer = choices[currentIndex + 1];
              console.log(`Trying next answer for qid ${qid}: ${selectedAnswer}`);
              dynamicAnswers[qid] = selectedAnswer;
              localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            } else {
              console.error(`No more choices to try for qid ${qid} after ${attempts} attempts`);
              allAnsweredAcceptably = false;
              break;
            }
          } else {
            console.error(`Max attempts (${maxAttemptsPerQuestion}) reached for qid ${qid}`);
            allAnsweredAcceptably = false;
            break;
          }
        } else {
          console.log(`Answer acceptable for qid ${qid}: ${selectedAnswer} (no danger class)`);
          answerAcceptable = true;
        }
      }

      if (!answerAcceptable) {
        allAnsweredAcceptably = false;
      }
    }

    // Only click nextButton if all questions have acceptable answers
    if (allAnsweredAcceptably) {
      const nextButton = document.getElementById('nextButton');
      if (nextButton && !nextButton.classList.contains('hide') && !nextButton.disabled) {
        console.log('All questions answered acceptably. Clicking nextButton.');
        nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      } else {
        console.error('Next button not found or not clickable.');
        setTimeout(solveMultipleChoice, 50);
        return false;
      }
    }

    // Retry if not all answers are acceptable
    console.log('Retrying after 50ms due to unacceptable answers.');
    setTimeout(solveMultipleChoice, 50);
    return false;
  }

  // Solver for matching questions with optimized delays, pair counting, and strict next button checks
  async function solveMatching(qBox, qid, isPikachuStyle = false, maxAttempts = 3) {
    // Helper function to check if an element is matched
    const isElementMatched = (element) => {
      const classes = Array.from(element.classList).join(', ');
      const isMatched = (
        ['matched', 'selected', 'paired', 'done', 'complete', 'disabled'].some(cls => element.classList.contains(cls)) ||
        element.hasAttribute('data-matched') ||
        element.getAttribute('aria-selected') === 'true' ||
        element.getAttribute('aria-disabled') === 'true' ||
        element.style.display === 'none' ||
        element.style.opacity === '0'
      );
      console.log(`Element ${element.getAttribute('id')}: isMatched=${isMatched}, classes=[${classes}], style=${element.style.cssText}, data=${JSON.stringify(element.dataset)}`);
      return isMatched;
    };

    // Helper function to count pairs to match
    const countPairs = (isPikachuStyle, qBox) => {
      if (isPikachuStyle) {
        const items = document.querySelectorAll(`.mapping-item[qid="${qid}"]`);
        const soundItem = Array.from(items).find(item =>
          item.querySelector('.mapping-text.danger') || item.querySelector('.mapping-text.info')
        );
        const tataItem = Array.from(items).find(item => item.querySelector('.mapping-text.tata'));
        return (soundItem && tataItem) ? 1 : 0;
      } else {
        const mbElements = qBox.querySelectorAll(`.matching.mb`);
        return mbElements.length;
      }
    };

    // Helper function to trigger click and wait
    const clickAndWait = async (element, delay = 20) => {
      if (element && !isElementMatched(element)) {
        console.log(`Clicking element: ${element.getAttribute('id')}`);
        element.click();
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    };

    // Helper function to check and activate the "Next" button
    const activateNextButton = async (attempt = 1) => {
      const nextButton = document.querySelector('#nextButton');
      if (!nextButton) {
        console.warn(`Next button not found for qid ${qid} (attempt ${attempt})`);
        return false;
      }
      const isClickable = !nextButton.disabled &&
                         nextButton.style.display !== 'none' &&
                         !nextButton.classList.contains('hide');
      console.log(`Next button state for qid ${qid}: disabled=${nextButton.disabled}, display=${nextButton.style.display}, classes=${nextButton.className}, isClickable=${isClickable}`);

      if (isClickable) {
        console.log(`Activating next button for qid ${qid} (attempt ${attempt})`);
        nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 50));
        return true;
      } else if (attempt < maxAttempts) {
        console.warn(`Next button not clickable for qid ${qid} (attempt ${attempt}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return await activateNextButton(attempt + 1);
      } else {
        console.error(`Failed to activate next button for qid ${qid} after ${maxAttempts} attempts`);
        return false;
      }
    };

    // Helper function to log completed matches
    const logCompletedMatches = (isPikachuStyle) => {
      const logMessage = [`Completed matches for qid ${qid}:`];
      if (isPikachuStyle) {
        const items = document.querySelectorAll(`.mapping-item[qid="${qid}"]`);
        const soundItem = Array.from(items).find(item =>
          item.querySelector('.mapping-text.danger') || item.querySelector('.mapping-text.info')
        );
        const tataItem = Array.from(items).find(item => item.querySelector('.mapping-text.tata'));
        if (soundItem && tataItem) {
          logMessage.push(`- Sound/Tata pair: ${soundItem.textContent.trim()} ↔ ${tataItem.textContent.trim()}`);
        }
      } else {
        const mbElements = qBox.querySelectorAll(`.matching.mb`);
        mbElements.forEach(mbElement => {
          const mbGroup = mbElement.getAttribute('group');
          const maElement = qBox.querySelector(`.matching.ma[group="${mbGroup}"]`);
          if (maElement && mbElement) {
            logMessage.push(`- Group ${mbGroup}: ${maElement.textContent.trim()} ↔ ${mbElement.textContent.trim()}`);
          }
        });
      }
      console.log(logMessage.join('\n'));
    };

    // Check if question is hidden
    if (qBox.classList.contains('hide')) {
      console.log(`Question ${qid} is hidden, skipping`);
      return false;
    }

    // Count number of pairs to match
    const pairCount = countPairs(isPikachuStyle, qBox);
    console.log(`Number of pairs to match for qid ${qid}: ${pairCount}`);

    if (pairCount === 0) {
      console.error(`No pairs to match for qid ${qid}`);
      return false;
    }

    // Perform matching for the required number of pairs
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Attempt ${attempt} for qid ${qid}`);

      if (isPikachuStyle) {
        const items = document.querySelectorAll(`.mapping-item[qid="${qid}"]`);
        const soundItem = Array.from(items).find(item =>
          item.querySelector('.mapping-text.danger') || item.querySelector('.mapping-text.info')
        );
        const tataItem = Array.from(items).find(item => item.querySelector('.mapping-text.tata'));

        if (!soundItem || !tataItem) {
          console.error(`Incomplete pair for qid ${qid}`);
          return false;
        }

        const pairId = `${qid}_sound_tata`;
        if (dynamicAnswers[pairId]) {
          console.log(`Using stored match for qid ${qid}: ${dynamicAnswers[pairId]}`);
          await clickAndWait(soundItem, 10);
          await clickAndWait(tataItem, 10);
        } else if (!isElementMatched(soundItem) && !isElementMatched(tataItem)) {
          console.log(`Matching sound and tata for qid ${qid}`);
          await clickAndWait(soundItem, 10);
          await clickAndWait(tataItem, 10);
          dynamicAnswers[pairId] = 'matched';
          localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        }

        // Log completed matches and activate next button after matching
        logCompletedMatches(true);
        await activateNextButton();
        return true;
      } else {
        const mbElements = qBox.querySelectorAll(`.matching.mb`);
        if (!mbElements.length) {
          console.error(`No mb elements found for qid ${qid}`);
          return false;
        }

        let matchedPairs = 0;
        for (const mbElement of mbElements) {
          const mbGroup = mbElement.getAttribute('group');
          const mbId = mbElement.getAttribute('id');
          const pairId = `${qid}_group_${mbGroup}`;
          console.log(`Checking mb element: ${mbId} (group ${mbGroup})`);

          const maElement = qBox.querySelector(`.matching.ma[group="${mbGroup}"]`);
          if (!maElement) {
            console.error(`No ma element found for group ${mbGroup}`);
            continue;
          }

          if (dynamicAnswers[pairId]) {
            console.log(`Using stored match for group ${mbGroup}: ${dynamicAnswers[pairId]}`);
            await clickAndWait(maElement, 20);
            await clickAndWait(mbElement, 20);
            matchedPairs++;
          } else if (!isElementMatched(maElement) && !isElementMatched(mbElement)) {
            console.log(`Found matching ma element: ${maElement.getAttribute('id')} (group ${mbGroup})`);
            await clickAndWait(maElement, 20);
            await clickAndWait(mbElement, 20);
            dynamicAnswers[pairId] = `${maElement.getAttribute('id')}_${mbId}`;
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            matchedPairs++;
          } else {
            console.log(`Group ${mbGroup} already matched`);
            matchedPairs++;
          }
        }

        // Check if all expected pairs are matched before activating next button
        if (matchedPairs === pairCount) {
          logCompletedMatches(false);
          await activateNextButton();
          return true;
        } else if (attempt < maxAttempts) {
          console.warn(`Only ${matchedPairs}/${pairCount} pairs matched for qid ${qid}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
      }

      console.warn(`Failed to match all ${pairCount} pairs for qid ${qid} after attempt ${attempt}`);
    }

    console.error(`Failed to complete matching for qid ${qid} after ${maxAttempts} attempts`);
    return false;
  }

  // Solver for fill-in questions with dynamic DOM analysis
  async function solveFillIn(qBox, qid) {
    // Find input element
    const inputElement = qBox.querySelector('input') || document.getElementById(`input-${qid}`);
    if (!inputElement) {
      console.error(`Input element for qid ${qid} not found`);
      return false;
    }

    // Find identifier for answer storage
    let identifier = qid;
    const spanElement = qBox.querySelector('span[id][class*="danger"], span[id][class*="warning"], span[id][class*="info"]') || qBox.querySelector('span[id]');
    if (spanElement) {
      const spanId = spanElement.getAttribute('id');
      const groupId = spanElement.getAttribute('groupid') || spanElement.getAttribute('group');
      identifier = groupId || spanId || qid;
      console.log(`Using identifier for qid ${qid}: ${identifier}`);
    } else {
      console.log(`No span with id found for qid ${qid}, using qid as identifier`);
    }

    let answer = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      // Check stored answer
      if (dynamicAnswers[identifier]) {
        answer = dynamicAnswers[identifier];
        console.log(`Using stored answer for identifier ${identifier}: ${answer}`);
      } else {
        // Try to extract answer from qText or similar
        const qText = qBox.querySelector(`#qText-${qid}`) || qBox.querySelector('div[class*="text"], p[class*="text"]');
        if (qText) {
          const text = qText.textContent.trim();
          const startIdx = text.indexOf('. ') + 2;
          let endIdx = text.indexOf(' -') !== -1 ? text.indexOf(' -') : text.length;
          if (startIdx >= 2) {
            answer = text.substring(startIdx, endIdx).trim();
            console.log(`Trying answer from qText for identifier ${identifier}: ${answer}`);
          } else {
            answer = 'wrong';
            console.log(`Trying 'wrong' for identifier ${identifier}`);
          }
        } else {
          answer = 'wrong';
          console.log(`Trying 'wrong' for identifier ${identifier}`);
        }
      }

      // Fill answer
      inputElement.value = answer;

      // Click nextButton
      const nextButton = document.getElementById('nextButton');
      if (nextButton && !nextButton.classList.contains('hide') && !nextButton.disabled) {
        nextButton.click();
      } else {
        console.error('Next button not found, hidden, or disabled');
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 20));

      // Check hint
      const hintElement = document.getElementById(`aHint-${qid}`) || qBox.querySelector('div[class*="hint"], span[class*="hint"]');
      const hintSpan = hintElement?.querySelector('span.warning, span.info, span[class*="hint"]');
      if (hintSpan) {
        answer = hintSpan.textContent.trim();
        dynamicAnswers[identifier] = answer;
        console.log(`Got answer from hint for identifier ${identifier}: ${answer}`);
        localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
      } else {
        console.log(`Correct answer for identifier ${identifier}: ${answer}`);
        dynamicAnswers[identifier] = answer;
        localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        break;
      }
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error(`Failed after ${maxAttempts} attempts for identifier ${identifier}`);
      return false;
    }

    // Final fill
    inputElement.value = answer;
    const nextButton = document.getElementById('nextButton');
    if (nextButton && !nextButton.classList.contains('hide') && !nextButton.disabled) {
      nextButton.click();
      return true;
    }
    return false;
  }

  // Main solver
  async function autoSolve() {
    // 1. eGuide/playButton
    const eGuide = document.getElementById('eGuide') || document.getElementById('eGiude');
    if (eGuide && !eGuide.classList.contains('hide')) {
      const playButton = document.getElementById('playButton');
      if (playButton) {
        console.log('eGuide is visible. Clicking Play button.');
        playButton.click();
        await new Promise(resolve => setTimeout(resolve, 50));
      } else {
        console.error('Play button not found in eGuide.');
      }
      setTimeout(autoSolve, 50);
      return;
    }

    // 2. circleNext
    const circleNext = document.getElementById('circleNext');
    if (circleNext && !circleNext.classList.contains('hide')) {
      if (circleNext.classList.contains('blinker')) {
        await new Promise(resolve => {
          const observer = new MutationObserver((mutations) => {
            if (!circleNext.classList.contains('blinker')) {
              observer.disconnect();
              resolve();
            }
          });
          observer.observe(circleNext, { attributes: true, attributeFilter: ['class'] });
        });
      }
      console.log('circleNext is visible. Clicking circleNext.');
      circleNext.click();
      await new Promise(resolve => setTimeout(resolve, 50));
      setTimeout(autoSolve, 50);
      return;
    }

    // 3. nextPlayButton
    const nextPlayButton = document.getElementById('nextPlayButton');
    if (nextPlayButton && !nextPlayButton.classList.contains('hide')) {
      console.log('Quiz completed! Saving answers and clicking nextPlayButton.');
      localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
      nextPlayButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }

    // 4. stageDone
    const stageDone = document.getElementById('stageDone');
    if (stageDone && !stageDone.classList.contains('hide')) {
      console.log('Exercise completed with stageDone. Saving answers.');
      localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
      return;
    }

    // Find current question
    const qBoxes = document.querySelectorAll('.qBox:not(.hide)');
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

    // Check Pikachu.js style (mapping-item)
    const qidElements = document.querySelectorAll('.mapping-item[qid]');
    const uniqueQids = [...new Set(Array.from(qidElements).map(el => el.getAttribute('qid')))];
    let pikachuStyle = false;
    if (uniqueQids.length > 0) {
      pikachuStyle = true;
      currentQid = uniqueQids[0];
      found = true;
    }

    if (!found) {
      console.log('No active question found.');
      return;
    }

    // Determine exercise type
    const nBox = document.getElementById('nBox');
    const exerciseType = nBox?.getAttribute('etype') || (pikachuStyle ? 'mapping' : 'unknown');

    // Solve based on type
    let solved = false;
    if (exerciseType === 'option') {
      solved = await solveMultipleChoice();
    } else if (exerciseType === 'matching' || pikachuStyle) {
      solved = await solveMatching(currentQBox, currentQid, pikachuStyle);
    } else if (exerciseType === 'fillin' || document.getElementById(`input-${currentQid}`) || currentQBox?.querySelector('input')) {
      solved = await solveFillIn(currentQBox, currentQid);
    } else {
      console.error(`Unknown exercise type: ${exerciseType}`);
    }

    // Continue
    setTimeout(autoSolve, 50);
  }

  // Reset function
  function resetDynamicAnswers() {
    dynamicAnswers = {};
    localStorage.removeItem(storageKey);
    console.log('Cleared in-memory and localStorage answers');
  }

  // Start the solver
  autoSolve();

  // Expose functions to global scope for external use
  window.autoSolve = autoSolve;
  window.solveMultipleChoice = solveMultipleChoice;
  window.solveMatching = solveMatching;
  window.solveFillIn = solveFillIn;
  window.resetDynamicAnswers = resetDynamicAnswers;
})();