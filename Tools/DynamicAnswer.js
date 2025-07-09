const currentUrl = window.location.href;
const storageKey = `dynamicAnswers_${currentUrl}`;
let dynamicAnswers = JSON.parse(localStorage.getItem(storageKey)) || [];

async function autoFillAnswers() {
    // Tìm câu hỏi hiện tại
    const qBoxes = document.querySelectorAll('.qBox');
    let currentIndex = 0;
    let currentQid = 0;
    qBoxes.forEach((box, index) => {
        if (!box.classList.contains('hide')) {
            currentIndex = index;
            currentQid = parseInt(box.getAttribute('qid'));
        }
    });

    // Tìm câu hỏi và từ/cụm từ cần dịch
    const currentQuestion = document.getElementById(`question-${currentQid}`);
    const dangerSpan = currentQuestion.querySelector('span.danger');
    if (!dangerSpan) {
        // Nếu không còn từ cần dịch, kiểm tra câu hỏi tiếp theo hoặc kết thúc
        if (currentIndex < qBoxes.length - 1) {
            setTimeout(autoFillAnswers, 1000); // Chờ 1s để chuyển câu hỏi
            return;
        } else {
            // Lưu mảng dynamicAnswers và in ra để kiểm tra
            localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
            console.log(`Hoàn thành! Dynamic Answers cho ${currentUrl}:`, dynamicAnswers);
            document.getElementById('stageDone').classList.remove('hide');
            document.getElementById('eContainer').classList.add('hide');
            const audio = document.getElementById('au_success_exercise');
            if (audio) audio.play();
            return;
        }
    }

    // Tìm ô nhập liệu
    const inputElement = document.getElementById(`input-${currentQid}`);
    if (!inputElement) {
        console.error(`Input element input-${currentQid} not found`);
        return;
    }

    // Tính chỉ số đáp án
    const groupId = parseInt(dangerSpan.getAttribute('groupid'));
    let answerIndex = 0;
    for (let i = 0; i < currentIndex; i++) {
        answerIndex += document.querySelectorAll(`#question-${qBoxes[i].getAttribute('qid')} span[groupid]`).length;
    }
    answerIndex += groupId - 1;

    let answer = '';

    // Kiểm tra xem đáp án đã có trong dynamicAnswers chưa
    if (dynamicAnswers[answerIndex]) {
        answer = dynamicAnswers[answerIndex];
        console.log(`Sử dụng đáp án từ dynamicAnswers[${answerIndex}] (URL: ${currentUrl}): ${answer}`);
    } else {
        // Tìm gợi ý
        const hintElement = document.getElementById(`aHint-${currentQid}`);
        const warningSpan = hintElement ? hintElement.querySelector('span.warning') : null;

        // Nếu gợi ý có đáp án, lấy và lưu
        if (warningSpan) {
            answer = warningSpan.textContent.trim();
            dynamicAnswers[answerIndex] = answer;
            console.log(`Lấy đáp án mới cho index ${answerIndex} (URL: ${currentUrl}): ${answer}`);
        } else {
            // Điền sai 3 lần để kích hoạt gợi ý
            for (let i = 0; i < 3; i++) {
                inputElement.value = 'wrong';
                const nextButton = document.getElementById('nextButton');
                if (nextButton && !nextButton.disabled) {
                    nextButton.click();
                } else {
                    console.error('Next button not found or disabled');
                    setTimeout(autoFillAnswers, 50);
                    return;
                }
                // Chờ 20ms vì phản hồi <50ms
                await new Promise(resolve => setTimeout(resolve, 20));
            }
            // Kiểm tra lại gợi ý
            const newWarningSpan = document.getElementById(`aHint-${currentQid}`).querySelector('span.warning');
            if (newWarningSpan) {
                answer = newWarningSpan.textContent.trim();
                dynamicAnswers[answerIndex] = answer;
                console.log(`Lấy đáp án mới sau 3 lần sai cho index ${answerIndex} (URL: ${currentUrl}): ${answer}`);
            } else {
                console.error(`Hint for question ${currentQid} not found after 3 attempts`);
                return;
            }
        }
        // Lưu dynamicAnswers sau khi thêm đáp án mới
        localStorage.setItem(storageKey, JSON.stringify(dynamicAnswers));
    }

    // Điền đáp án đúng
    inputElement.value = answer;

    // Nhấn nút Next
    const nextButton = document.getElementById('nextButton');
    if (nextButton && !nextButton.disabled) {
        nextButton.click();
    } else {
        console.error('Next button not found or disabled');
        setTimeout(autoFillAnswers, 50);
        return;
    }

    // Lặp lại sau 50ms
    setTimeout(autoFillAnswers, 50);
}

// Khởi chạy
autoFillAnswers();

// Hàm để xóa dynamicAnswers cho URL hiện tại
function resetDynamicAnswers() {
    localStorage.removeItem(storageKey);
    dynamicAnswers = [];
    console.log(`Đã xóa dynamicAnswers cho URL: ${currentUrl}`);
}