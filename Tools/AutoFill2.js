const currentUrl = window.location.href.split('&')[0];
const storageKey = `dynamicAnswers_adverb_${currentUrl}`;
let dynamicAnswers = JSON.parse(localStorage.getItem(storageKey)) || {};

async function autoFillAdverb() {
    // Kiểm tra trạng thái circleNext
    const circleNext = document.getElementById('circleNext');
    if (circleNext && !circleNext.classList.contains('hide')) {
        if (circleNext.classList.contains('blinker')) {
            // Chờ blinker biến mất
            await new Promise(resolve => {
                const observer = new MutationObserver((mutations) => {
                    if (!circleNext.classList.contains('blinker')) {
                        observer.disconnect();
                        resolve();
                    }
                });
                observer.observe(circleNext, { attributes: true, attributeFilter: ['class'] });
            });
            circleNext.click();
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        setTimeout(autoFillAdverb, 50);
        return;
    }

    // Tìm câu hỏi hiện tại
    const qBoxes = document.querySelectorAll('.qBox');
    let currentQid = 0;
    let dangerId = '';
    let found = false;
    qBoxes.forEach((box) => {
        if (!box.classList.contains('hide')) {
            currentQid = parseInt(box.getAttribute('qid'));
            const qText = document.getElementById(`qText-${currentQid}`);
            if (qText) {
                const dangerSpan = qText.querySelector('span.danger');
                if (dangerSpan) {
                    dangerId = dangerSpan.getAttribute('id'); // Ví dụ: group-500378-1
                }
            }
            found = true;
        }
    });

    // Kiểm tra nếu hoàn thành
    if (!found) {
        localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        console.log(`Hoàn thành nhập trạng từ! ${storageKey}:`, dynamicAnswers);
        const nextPlayButton = document.getElementById('nextPlayButton');
        if (nextPlayButton && !nextPlayButton.classList.contains('hide')) {
            nextPlayButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.error('nextPlayButton không tìm thấy hoặc bị ẩn');
        }
        return;
    }

    // Kiểm tra nếu không tìm thấy dangerId
    if (!dangerId) {
        console.error(`Không tìm thấy thẻ span.danger cho qid ${currentQid}`);
        setTimeout(autoFillAdverb, 50);
        return;
    }

    // Tìm ô nhập liệu
    const inputElement = document.getElementById(`input-${currentQid}`);
    if (!inputElement) {
        console.error(`Không tìm thấy ô nhập liệu input-${currentQid}`);
        return;
    }

    let answer = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        // Ưu tiên đáp án từ localStorage dựa trên dangerId
        if (dynamicAnswers[dangerId]) {
            answer = dynamicAnswers[dangerId];
            console.log(`Thử đáp án từ storage cho dangerId ${dangerId}: ${answer}`);
        } else {
            // Lấy văn bản từ qText và xử lý các span
            const qText = document.getElementById(`qText-${currentQid}`);
            if (qText) {
                // Lấy tất cả các span
                const spans = qText.querySelectorAll('span[id^="group-"]');
                let answerParts = qText.textContent.trim().split(/____/);
                let answerWords = [];

                // Xử lý các span, ưu tiên span có lớp danger
                spans.forEach((span, index) => {
                    const isDanger = span.classList.contains('danger');
                    if (isDanger) {
                        answerWords.push('[danger-word]'); // Placeholder, sẽ thay bằng từ đúng từ hint
                    } else {
                        answerWords.push('[word]'); // Placeholder cho các span khác
                    }
                });

                // Tạo câu trả lời ban đầu
                answer = answerParts.reduce((acc, part, index) => {
                    return acc + part + (answerWords[index] || '');
                }, '').trim();

                // Thử lấy đáp án từ hint
                const hintElement = document.getElementById(`aHint-${currentQid}`);
                if (hintElement && hintElement.querySelector('span.warning')) {
                    answer = hintElement.querySelector('span.warning').textContent.trim();
                    console.log(`Lấy đáp án từ warning cho dangerId ${dangerId}: ${answer}`);
                } else if (!answer || answer.includes('[word]') || answer.includes('[danger-word]')) {
                    answer = 'wrong';
                    console.log(`Thử với 'wrong' cho dangerId ${dangerId}`);
                }
            } else {
                answer = 'wrong';
                console.log(`Thử với 'wrong' cho dangerId ${dangerId}`);
            }
        }

        // Điền đáp án
        inputElement.value = answer;

        // Nhấn nút Next
        const nextButton = document.getElementById('nextButton');
        if (nextButton && !nextButton.disabled) {
            nextButton.click();
        } else {
            console.error('Nút Next không tìm thấy hoặc bị vô hiệu hóa');
            setTimeout(autoFillAdverb, 50);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 20));

        // Kiểm tra gợi ý
        const hintElement = document.getElementById(`aHint-${currentQid}`);
        const warningSpan = hintElement ? hintElement.querySelector('span.warning') : null;

        if (warningSpan) {
            // Lấy đáp án từ warning
            answer = warningSpan.textContent.trim();
            dynamicAnswers[dangerId] = answer;
            console.log(`Lấy đáp án từ warning cho dangerId ${dangerId}: ${answer}`);
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
        } else {
            // Đáp án đúng
            dynamicAnswers[dangerId] = answer;
            console.log(`Đáp án đúng cho dangerId ${dangerId}: ${answer}`);
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            break;
        }

        attempts++;
    }

    if (attempts >= maxAttempts) {
        console.error(`Đã thử ${maxAttempts} lần cho dangerId ${dangerId} mà không có warning hoặc đáp án đúng`);
        return;
    }

    // Điền đáp án lần cuối
    inputElement.value = answer;

    // Nhấn nút Next lần cuối
    const nextButton = document.getElementById('nextButton');
    if (nextButton && !nextButton.disabled) {
        nextButton.click();
    } else {
        console.error('Nút Next không tìm thấy hoặc bị vô hiệu hóa');
        setTimeout(autoFillAdverb, 50);
        return;
    }

    // Tiếp tục sau 50ms
    setTimeout(autoFillAdverb, 50);
}

// Bắt đầu
autoFillAdverb();

// Hàm reset
function resetDynamicAnswers() {
    localStorage.removeItem(storageKey);
}