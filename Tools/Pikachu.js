    const currentUrl = window.location.href.split('&')[0];
    const storageKey = `dynamicAnswers_matching_${currentUrl}`;

    async function autoMatchAnswers() {
        // Tìm tất cả qid độc nhất
        const qidElements = document.querySelectorAll('.mapping-item[qid]');
        const uniqueQids = [...new Set(Array.from(qidElements).map(el => el.getAttribute('qid')))];

        // Kiểm tra xem còn cặp nào chưa hoàn thành không
        let allMatched = true;
        let currentQid = uniqueQids[0];
        for (let qid of uniqueQids) {
            const items = document.querySelectorAll(`.mapping-item[qid="${qid}"]`);
            const soundItem = Array.from(items).find(item => 
                item.querySelector('.mapping-text.danger') || item.querySelector('.mapping-text.info')
            );
            const tataItem = Array.from(items).find(item => item.querySelector('.mapping-text.tata'));
            if (soundItem && tataItem && soundItem.offsetParent !== null && tataItem.offsetParent !== null && 
                !soundItem.classList.contains('matched') && !tataItem.classList.contains('matched')) {
                currentQid = qid;
                allMatched = false;
                break;
            }
        }

        // Nếu tất cả cặp đã ghép, nhấn nextPlayButton
        if (allMatched) {
            console.log('Hoàn thành nối! Tất cả cặp đã được ghép.');
            const nextPlayButton = document.getElementById('nextPlayButton');
            if (nextPlayButton && !nextPlayButton.classList.contains('hide')) {
                nextPlayButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000)); // Chờ 1000ms
            } else {
                console.error('nextPlayButton not found or hidden');
            }
            return;
        }

        // Nhấp đúng: sound (danger hoặc info) trước, tata sau
        const items = document.querySelectorAll(`.mapping-item[qid="${currentQid}"]`);
        const soundItem = Array.from(items).find(item => 
            item.querySelector('.mapping-text.danger') || item.querySelector('.mapping-text.info')
        );
        const tataItem = Array.from(items).find(item => item.querySelector('.mapping-text.tata'));
        if (!soundItem || !tataItem) {
            console.error(`Cặp không đầy đủ cho qid ${currentQid}`);
            return;
        }
        soundItem.click();
        await new Promise(resolve => setTimeout(resolve, 20)); // Chờ 20ms
        tataItem.click();
        await new Promise(resolve => setTimeout(resolve, 20)); // Chờ 20ms

        // Lặp lại sau 50ms
        setTimeout(autoMatchAnswers, 50);
    }

    // Khởi chạy
    autoMatchAnswers();