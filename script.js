import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// --- DOM ELEMENTS ---
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const notificationEl = document.getElementById('notification');
const transactionForm = document.getElementById('transactionForm');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const noteInput = document.getElementById('note');
const transactionListEl = document.getElementById('transactionList');
const totalSpentEl = document.getElementById('totalSpent');
const analyzeBtn = document.getElementById('analyzeBtn');
const aiAnalysisResultEl = document.getElementById('aiAnalysisResult');

// --- STATE MANAGEMENT ---
let apiKey = '';
let genAI;
let model;
let transactions = [];

// --- FUNCTIONS ---

/**
 * Hiển thị thông báo (notification)
 * @param {string} message - Nội dung thông báo
 * @param {string} type - 'success' hoặc 'error'
 */
function showNotification(message, type = 'success') {
    notificationEl.textContent = message;
    notificationEl.className = `notification show ${type}`;
    setTimeout(() => {
        notificationEl.className = 'notification';
    }, 4000);
}

/**
 * Lưu API Key và khởi tạo model Gemini
 */
async function initializeAi() {
    apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showNotification('Vui lòng nhập API Key của bạn.', 'error');
        return;
    }

    try {
        saveApiKeyBtn.textContent = 'Đang khởi tạo...';
        saveApiKeyBtn.disabled = true;

        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Thử một prompt nhỏ để xác thực key
        await model.generateContent("hello");

        localStorage.setItem('geminiApiKey', apiKey);
        showNotification('API Key đã được lưu và khởi tạo thành công!', 'success');
        analyzeBtn.disabled = false;

    } catch (error) {
        console.error("Lỗi khởi tạo AI:", error);
        showNotification('Khởi tạo thất bại! Vui lòng kiểm tra lại API Key.', 'error');
        analyzeBtn.disabled = true;
    } finally {
        saveApiKeyBtn.textContent = 'Lưu & Khởi tạo';
        saveApiKeyBtn.disabled = false;
    }
}

/**
 * Render lại danh sách giao dịch và tổng chi tiêu
 */
function renderTransactions() {
    transactionListEl.innerHTML = '';
    let totalSpent = 0;

    if (transactions.length === 0) {
        transactionListEl.innerHTML = '<li>Chưa có giao dịch nào.</li>';
    } else {
        transactions.forEach(tx => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="transaction-details">
                    <span>${tx.category}</span>
                    <span class="transaction-note">${tx.note}</span>
                </div>
                <span class="transaction-amount">${tx.amount.toLocaleString('vi-VN')} VND</span>
            `;
            transactionListEl.appendChild(li);
            totalSpent += tx.amount;
        });
    }

    totalSpentEl.textContent = `${totalSpent.toLocaleString('vi-VN')} VND`;
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

/**
 * Thêm một giao dịch mới
 * @param {Event} e - Event từ form submission
 */
function addTransaction(e) {
    e.preventDefault();
    const amount = +amountInput.value;
    const category = categoryInput.value;
    const note = noteInput.value.trim();

    if (!amount || !category) {
        showNotification('Vui lòng nhập đủ số tiền và danh mục.', 'error');
        return;
    }

    const newTransaction = {
        id: Date.now(),
        amount,
        category,
        note,
        date: new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'
    };

    transactions.push(newTransaction);
    showNotification('Đã thêm giao dịch thành công!', 'success');
    renderTransactions();
    transactionForm.reset();
    categoryInput.value = "";
}

/**
 * Gửi dữ liệu đến Gemini và nhận phân tích
 */
async function analyzeSpending() {
    if (!model) {
        showNotification('AI chưa được khởi tạo. Vui lòng nhập API Key.', 'error');
        return;
    }
    if (transactions.length < 3) {
        showNotification('Cần ít nhất 3 giao dịch để phân tích hiệu quả.', 'error');
        return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🤖 AI đang phân tích...';
    aiAnalysisResultEl.innerHTML = '<p>Vui lòng chờ trong giây lát...</p>';

    const prompt = `
        Bạn là một chuyên gia tư vấn tài chính cá nhân tên là "Ví Thông Minh AI", giọng văn thân thiện, động viên và chuyên nghiệp.
        Dựa trên danh sách chi tiêu của người dùng trong tháng vừa qua dưới đây (định dạng JSON), hãy thực hiện các yêu cầu sau:

        1.  **Nhận xét tổng quan (2-3 dòng):** Đưa ra một nhận xét ngắn gọn về thói quen chi tiêu của họ.
        2.  **Điểm sáng & Điểm cần lưu ý:** Chỉ ra 1-2 danh mục chi tiêu chiếm tỷ trọng cao nhất và một vài khoản chi bất thường (nếu có).
        3.  **Lời khuyên Vàng (3 gạch đầu dòng):** Đưa ra 3 lời khuyên cụ thể, hữu ích và có thể hành động ngay để giúp họ tiết kiệm hiệu quả hơn. Ví dụ: "Giảm tần suất ăn ngoài từ 5 lần/tuần xuống 3 lần/tuần có thể giúp bạn tiết kiệm X tiền".
        4.  **Dự báo vui:** Dựa trên mức chi tiêu này, đưa ra một dự báo nhỏ, ví dụ: "Nếu tiếp tục đà này, bạn đang đi đúng hướng để đạt mục tiêu Y!" hoặc "Cẩn thận, ví tiền của bạn có thể sẽ 'mỏng' đi vào cuối tháng đấy!".

        Hãy trả lời bằng tiếng Việt và sử dụng định dạng Markdown để dễ đọc (tiêu đề in đậm, gạch đầu dòng).

        Dữ liệu chi tiêu của người dùng:
        ${JSON.stringify(transactions, null, 2)}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        aiAnalysisResultEl.innerHTML = text; // Gemini thường trả về Markdown, dùng innerHTML để render cơ bản
    } catch (error) {
        console.error("Lỗi gọi API Gemini:", error);
        aiAnalysisResultEl.innerHTML = '<p style="color: red;">Đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại.</p>';
        showNotification('Lỗi phân tích từ AI.', 'error');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Nhờ AI Phân Tích Ngay';
    }
}


// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Tải dữ liệu từ localStorage nếu có
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        initializeAi();
    }
    
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
        renderTransactions();
    }
    
    // Gán sự kiện
    saveApiKeyBtn.addEventListener('click', initializeAi);
    transactionForm.addEventListener('submit', addTransaction);
    analyzeBtn.addEventListener('click', analyzeSpending);
});
