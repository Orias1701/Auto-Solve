(function() {
  // Unified solver for multiple exercise types
  const currentUrl = window.location.href.split('&')[0];

  // Temporary storage for answers (in-memory, not localStorage)
  let dynamicAnswers = {};

  // Solver for multiple-choice questions
  async function solveMultipleChoice(qBox, qid) {
    const options = qBox.querySelectorAll(`.option-${qid}`);
    if (!options.length) {
      console.error(`No options found for qid ${qid}`);
      return false;
    }

    for (const option of options) {
      const chooseValue = option.getAttribute('choose');
      console.log(`Trying option ${chooseValue} for qid ${qid}`);
      option.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      const nextButton = document.getElementById('nextButton');
      if (nextButton && !nextButton.classList.contains('hide') && !nextButton.disabled) {
        console.log(`Correct answer found for qid ${qid}: ${chooseValue}`);
        dynamicAnswers[qid] = chooseValue;
        nextButton.click();
        return true;
      }

      const stillActive = Array.from(document.querySelectorAll('.qBox')).some(
        box => box.getAttribute('qid') === qid.toString() && !box.classList.contains('hide')
      );
      if (!stillActive) {
        console.log(`Question changed for qid ${qid}: ${chooseValue}`);
        dynamicAnswers[qid] = chooseValue;
        return true;
      }
    }
    return false;
  }

  // Solver for matching questions (supports both ma/mb and sound/tata)
  async function solveMatching(qBox, qid, isPikachuStyle = false) {
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
      if (!soundItem.classList.contains('matched') && !tataItem.classList.contains('matched')) {
        console.log(`Matching sound and tata for qid ${qid}`);
        soundItem.click();
        await new Promise(resolve => setTimeout(resolve, 20));
        tataItem.click();
        await new Promise(resolve => setTimeout(resolve, 20));
        return true;
      }
      return false;
    } else {
      const mbElements = qBox.querySelectorAll(`.matching.mb`);
      if (!mbElements.length) {
        console.error(`No mb elements found for qid ${qid}`);
        return false;
      }

      for (const mbElement of mbElements) {
        const mbGroup = mbElement.getAttribute('group');
        const mbId = mbElement.getAttribute('id');
        console.log(`Checking mb element: ${mbId} (group ${mbGroup})`);

        const maElement = qBox.querySelector(`.matching.ma[group="${mbGroup}"]`);
        if (!maElement) {
          console.error(`No ma element found for group ${mbGroup}`);
          continue;
        }

        const maId = maElement.getAttribute('id');
        console.log(`Found matching ma element: ${maId} (group ${mbGroup})`);
        maElement.click();
        await new Promise(resolve => setTimeout(resolve, 50));
        mbElement.click();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return true;
    }
  }

  // Solver for fill-in questions with dynamic DOM analysis
  async function solveFillIn(qBox, qid) {
    // Find input element
    const inputElement = qBox.querySelector('input') || document.getElementById(`input-${qid}`);
    if (!inputElement) {
      console.error(`Input element for qid ${qid} not found`);
      return false;
    }

    // Find identifier (id, group, groupid) for answer storage
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
      } else {
        console.log(`Correct answer for identifier ${identifier}: ${answer}`);
        dynamicAnswers[identifier] = answer;
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
    // Check control buttons first
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
    if (circleNext) {
      if (!circleNext.classList.contains('hide')) {
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
    }

    // 3. nextPlayButton
    const nextPlayButton = document.getElementById('nextPlayButton');
    if (nextPlayButton && !nextPlayButton.classList.contains('hide')) {
      console.log('Quiz completed! Clicking nextPlayButton.');
      nextPlayButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      solved = await solveMultipleChoice(currentQBox, currentQid);
    } else if (exerciseType === 'matching' || pikachuStyle) {
      solved = await solveMatching(currentQBox, currentQid, pikachuStyle);
    } else if (exerciseType === 'fillin' || document.getElementById(`input-${currentQid}`) || qBox?.querySelector('input')) {
      solved = await solveFillIn(currentQBox, currentQid);
    } else {
      console.error(`Unknown exercise type: ${exerciseType}`);
    }

    // Check stageDone
    const stageDone = document.getElementById('stageDone');
    if (stageDone && !stageDone.classList.contains('hide')) {
      console.log('Exercise completed with stageDone.');
      const audio = document.getElementById('au_success_exercise');
      if (audio) {
        console.log('Playing success audio.');
        audio.play();
      }
      return;
    }

    // Continue
    setTimeout(autoSolve, 50);
  }

  // Reset function
  function resetDynamicAnswers() {
    dynamicAnswers = {};
    console.log('Cleared in-memory answers');
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