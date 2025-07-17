// ==UserScript==
// @name         AutoSolve Script
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto solve exercises
// @match        https://rootlearning.vn/homework.php?*
// @grant        none
// ==/UserScript==

(function() {
  const currentUrl = window.location.href.split('&')[0];
  const storageKey = `dynamicAnswers_${currentUrl}`;
  let dynamicAnswers = JSON.parse(localStorage.getItem(storageKey)) || {};
  const choices = ['A', 'B', 'C', 'D'];

  async function solveMultipleChoice() {
    const qBoxes = document.querySelectorAll('.qBox:not(.hide)');
    if (!qBoxes.length) {
      return false;
    }

    let allAnsweredAcceptably = true;
    const maxAttemptsPerQuestion = 5;

    for (const qBox of qBoxes) {
      const qid = parseInt(qBox.getAttribute('qid'));
      const options = qBox.querySelectorAll(`.option-${qid}`);
      if (!options.length) {
        allAnsweredAcceptably = false;
        continue;
      }

      let attempts = 0;
      let selectedAnswer = dynamicAnswers[qid];
      let answerAcceptable = false;

      while (attempts < maxAttemptsPerQuestion && !answerAcceptable) {
        if (selectedAnswer && choices.includes(selectedAnswer)) {
          const option = Array.from(options).find(opt => opt.getAttribute('choose') === selectedAnswer);
          if (option) {
            option.click();
            await new Promise(resolve => setTimeout(resolve, 50));
          } else {
            allAnsweredAcceptably = false;
            break;
          }
        } else {
          const previousAnswer = dynamicAnswers[qid];
          const startIndex = previousAnswer ? choices.indexOf(previousAnswer) + 1 : 0;
          if (startIndex >= choices.length) {
            allAnsweredAcceptably = false;
            break;
          }

          const choice = choices[startIndex];
          const option = Array.from(options).find(opt => opt.getAttribute('choose') === choice);
          if (option) {
            option.click();
            selectedAnswer = choice;
            dynamicAnswers[qid] = choice;
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            await new Promise(resolve => setTimeout(resolve, 50));
          } else {
            allAnsweredAcceptably = false;
            break;
          }
        }

        const selectedOption = Array.from(options).find(opt => opt.getAttribute('choose') === selectedAnswer);
        const hintElement = document.getElementById(`aWrong-${qid}`) || document.getElementById(`aHint-${qid}`);
        const hasDangerClass = selectedOption && Array.from(selectedOption.classList).some(cls => cls.includes('danger'));
        if (hasDangerClass || (hintElement && hintElement.textContent.trim())) {
          attempts++;
          if (attempts < maxAttemptsPerQuestion) {
            const currentIndex = choices.indexOf(selectedAnswer);
            if (currentIndex + 1 < choices.length) {
              selectedAnswer = choices[currentIndex + 1];
              dynamicAnswers[qid] = selectedAnswer;
              localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            } else {
              allAnsweredAcceptably = false;
              break;
            }
          } else {
            allAnsweredAcceptably = false;
            break;
          }
        } else {
          answerAcceptable = true;
        }
      }

      if (!answerAcceptable) {
        allAnsweredAcceptably = false;
      }
    }

    if (allAnsweredAcceptably) {
      const nextButton = document.getElementById('nextButton');
      if (nextButton && !nextButton.classList.contains('hide') && !nextButton.disabled) {
        nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      } else {
        setTimeout(solveMultipleChoice, 50);
        return false;
      }
    }

    setTimeout(solveMultipleChoice, 50);
    return false;
  }

  async function solveMatching(qBox, qid, isPikachuStyle = false, maxAttempts = 3) {
    const isElementMatched = (element) => {
      return (
        ['matched', 'selected', 'paired', 'done', 'complete', 'disabled'].some(cls => element.classList.contains(cls)) ||
        element.hasAttribute('data-matched') ||
        element.getAttribute('aria-selected') === 'true' ||
        element.getAttribute('aria-disabled') === 'true' ||
        element.style.display === 'none' ||
        element.style.opacity === '0'
      );
    };

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

    const clickAndWait = async (element, delay = 20) => {
      if (element && !isElementMatched(element)) {
        element.click();
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    };

    const activateNextButton = async (attempt = 1) => {
      const nextButton = document.querySelector('#nextButton');
      if (!nextButton) {
        return false;
      }
      const isClickable = !nextButton.disabled &&
                         nextButton.style.display !== 'none' &&
                         !nextButton.classList.contains('hide');
      if (isClickable) {
        nextButton.click();
        await new Promise(resolve => setTimeout(resolve, 50));
        return true;
      } else if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return await activateNextButton(attempt + 1);
      } else {
        return false;
      }
    };

    if (qBox.classList.contains('hide')) {
      return false;
    }

    const pairCount = countPairs(isPikachuStyle, qBox);
    if (pairCount === 0) {
      return false;
    }

    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      if (isPikachuStyle) {
        const items = document.querySelectorAll(`.mapping-item[qid="${qid}"]`);
        const soundItem = Array.from(items).find(item =>
          item.querySelector('.mapping-text.danger') || item.querySelector('.mapping-text.info')
        );
        const tataItem = Array.from(items).find(item => item.querySelector('.mapping-text.tata'));

        if (!soundItem || !tataItem) {
          return false;
        }

        const pairId = `${qid}_sound_tata`;
        if (dynamicAnswers[pairId]) {
          await clickAndWait(soundItem, 10);
          await clickAndWait(tataItem, 10);
        } else if (!isElementMatched(soundItem) && !isElementMatched(tataItem)) {
          await clickAndWait(soundItem, 10);
          await clickAndWait(tataItem, 10);
          dynamicAnswers[pairId] = 'matched';
          localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        }

        await activateNextButton();
        return true;
      } else {
        const mbElements = qBox.querySelectorAll(`.matching.mb`);
        if (!mbElements.length) {
          return false;
        }

        let matchedPairs = 0;
        for (const mbElement of mbElements) {
          const mbGroup = mbElement.getAttribute('group');
          const mbId = mbElement.getAttribute('id');
          const pairId = `${qid}_group_${mbGroup}`;
          const maElement = qBox.querySelector(`.matching.ma[group="${mbGroup}"]`);
          if (!maElement) {
            continue;
          }

          if (dynamicAnswers[pairId]) {
            await clickAndWait(maElement, 20);
            await clickAndWait(mbElement, 20);
            matchedPairs++;
          } else if (!isElementMatched(maElement) && !isElementMatched(mbElement)) {
            await clickAndWait(maElement, 20);
            await clickAndWait(mbElement, 20);
            dynamicAnswers[pairId] = `${maElement.getAttribute('id')}_${mbId}`;
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            matchedPairs++;
          } else {
            matchedPairs++;
          }
        }

        if (matchedPairs === pairCount) {
          await activateNextButton();
          return true;
        } else if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
      }
    }

    return false;
  }

  async function solveFillIn(qBox, qid) {
    const inputElement = qBox.querySelector('input') || document.getElementById(`input-${qid}`);
    if (!inputElement) {
      return false;
    }

    let identifier = qid;
    const spanElement = qBox.querySelector('span[id][class*="danger"], span[id][class*="warning"], span[id][class*="info"]') || qBox.querySelector('span[id]');
    if (spanElement) {
      const spanId = spanElement.getAttribute('id');
      const groupId = spanElement.getAttribute('groupid') || spanElement.getAttribute('group');
      identifier = groupId || spanId || qid;
    }

    let answer = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      if (dynamicAnswers[identifier]) {
        answer = dynamicAnswers[identifier];
      } else {
        const qText = qBox.querySelector(`#qText-${qid}`) || qBox.querySelector('div[class*="text"], p[class*="text"]');
        if (qText) {
          const text = qText.textContent.trim();
          const startIdx = text.indexOf('. ') + 2;
          let endIdx = text.indexOf(' -') !== -1 ? text.indexOf(' -') : text.length;
          if (startIdx >= 2) {
            answer = text.substring(startIdx, endIdx).trim();
          } else {
            answer = 'wrong';
          }
        } else {
          answer = 'wrong';
        }
      }

      inputElement.value = answer;
      const nextButton = document.getElementById('nextButton');
      if (nextButton && !nextButton.classList.contains('hide') && !nextButton.disabled) {
        nextButton.click();
      } else {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 20));

      const hintElement = document.getElementById(`aHint-${qid}`) || qBox.querySelector('div[class*="hint"], span[class*="hint"]');
      const hintSpan = hintElement?.querySelector('span.warning, span.info, span[class*="hint"]');
      if (hintSpan) {
        answer = hintSpan.textContent.trim();
        dynamicAnswers[identifier] = answer;
        localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
      } else {
        dynamicAnswers[identifier] = answer;
        localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        break;
      }
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return false;
    }

    inputElement.value = answer;
    const nextButton = document.getElementById('nextButton');
    if (nextButton && !nextButton.classList.contains('hide') && !nextButton.disabled) {
      nextButton.click();
      return true;
    }
    return false;
  }

  async function autoSolve() {
    const eGuide = document.getElementById('eGuide') || document.getElementById('eGiude');
    if (eGuide && !eGuide.classList.contains('hide')) {
      const playButton = document.getElementById('playButton');
      if (playButton) {
        playButton.click();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      setTimeout(autoSolve, 50);
      return;
    }

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
      circleNext.click();
      await new Promise(resolve => setTimeout(resolve, 50));
      setTimeout(autoSolve, 50);
      return;
    }

    const nextPlayButton = document.getElementById('nextPlayButton');
    if (nextPlayButton && !nextPlayButton.classList.contains('hide')) {
      localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
      nextPlayButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }

    const stageDone = document.getElementById('stageDone');
    if (stageDone && !stageDone.classList.contains('hide')) {
      localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
      return;
    }

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

    const qidElements = document.querySelectorAll('.mapping-item[qid]');
    const uniqueQids = [...new Set(Array.from(qidElements).map(el => el.getAttribute('qid')))];
    let pikachuStyle = false;
    if (uniqueQids.length > 0) {
      pikachuStyle = true;
      currentQid = uniqueQids[0];
      found = true;
    }

    if (!found) {
      return;
    }

    const nBox = document.getElementById('nBox');
    const exerciseType = nBox?.getAttribute('etype') || (pikachuStyle ? 'mapping' : 'unknown');
    let solved = false;
    if (exerciseType === 'option') {
      solved = await solveMultipleChoice();
    } else if (exerciseType === 'matching' || pikachuStyle) {
      solved = await solveMatching(currentQBox, currentQid, pikachuStyle);
    } else if (exerciseType === 'fillin' || document.getElementById(`input-${currentQid}`) || currentQBox?.querySelector('input')) {
      solved = await solveFillIn(currentQBox, currentQid);
    }

    setTimeout(autoSolve, 50);
  }

  function resetDynamicAnswers() {
    dynamicAnswers = {};
    localStorage.removeItem(storageKey);
  }

  autoSolve();

  window.autoSolve = autoSolve;
  window.solveMultipleChoice = solveMultipleChoice;
  window.solveMatching = solveMatching;
  window.solveFillIn = solveFillIn;
  window.resetDynamicAnswers = resetDynamicAnswers;
})();