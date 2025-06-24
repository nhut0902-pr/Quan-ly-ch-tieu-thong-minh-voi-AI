// script.js - PHIÊN BẢN DATABASE

// --- DOM ELEMENTS ---
// (Giữ nguyên khai báo tất cả các DOM element như phiên bản trước)
const notificationEl = document.getElementById('notification');
const transactionForm = document.getElementById('transactionForm');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const noteInput = document.getElementById('note');
const transactionListEl = document.getElementById('transactionList');
const totalSpentEl = document.getElementById('totalSpent');
const analyzeBtn = document.getElementById('analyzeBtn');
const aiAnalysisResultEl = document.getElementById('aiAnalysisResult');
const receiptUploadInput = document.getElementById('receiptUpload');
const uploadLabel = document.getElementById('uploadLabel');
const uploadSpinner = document.getElementById('uploadSpinner');
const subscriptionListEl = document.getElementById('subscriptionList');
const subscriptionTotalEl = document.getElementById('subscriptionTotal');
const analyzeSubscriptionsBtn = document.getElementById('analyzeSubscriptionsBtn');
const subscriptionAdviceEl = document.getElementById('subscriptionAdvice');
const generateChallengeBtn = document.getElementById('generateChallengeBtn');
const challengeDisplay = document.getElementById('challengeDisplay');
const challengeTitle = document.getElementById('challengeTitle');
const challengeDescription = document.getElementById('challengeDescription');
const challengeSavings = document.getElementById('challengeSavings');
const forecastDemoBtn = document.getElementById('forecastDemoBtn');


// --- STATE MANAGEMENT ---
let transactions = []; // Vẫn giữ mảng này để quản lý UI, nhưng nguồn dữ liệu là DB

// --- HELPER FUNCTIONS ---
function showNotification(message, type = 'success') { /* ... code không đổi ... */ }
function toBase64(file) { /* ... code không đổi ... */ }

// --- UI RENDERING ---
function renderTransactions() {
    transactionListEl.innerHTML = '';
    let totalSpent = 0;
    if (transactions.length === 0) {
        transactionListEl.innerHTML = '<li>Chưa có giao dịch nào.</li>';
    } else {
        transactions.forEach(tx => {
            const li = document.createElement('li');
            const amount = parseFloat(tx.amount);
            li.innerHTML = `<div class="transaction-details"><span>${tx.category}</span><span class="transaction-note">${tx.note}</span></div><span class="transaction-amount">${amount.toLocaleString('vi-VN')} VND</span>`;
            transactionListEl.appendChild(li);
            totalSpent += amount;
        });
    }
    totalSpentEl.textContent = `${totalSpent.toLocaleString('vi-VN')} VND`;
}

// --- DATABASE INTERACTIONS ---
async function fetchTransactions() {
    try {
        const response = await fetch('/.netlify/functions/get-transactions');
        if (!response.ok) throw new Error('Không thể tải giao dịch.');
        transactions = await response.json();
        renderTransactions();
        renderDetectedSubscriptions();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function postTransaction(e) {
    e.preventDefault();
    const newTx = {
        amount: +amountInput.value,
        category: categoryInput.value,
        note: noteInput.value.trim(),
        date: new Date().toISOString().split('T')[0]
    };
    if (!newTx.amount || !newTx.category) {
        showNotification('Vui lòng nhập đủ số tiền và danh mục.', 'error');
        return;
    }
    try {
        const response = await fetch('/.netlify/functions/add-transaction', {
            method: 'POST',
            body: JSON.stringify(newTx)
        });
        if (!response.ok) throw new Error('Không thể thêm giao dịch.');
        showNotification('Đã thêm giao dịch thành công!', 'success');
        transactionForm.reset();
        categoryInput.value = "";
        await fetchTransactions(); // Tải lại toàn bộ dữ liệu
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// --- AI PROCESSOR CALLS ---
async function callAI(mode, payload = {}) {
    try {
        const response = await fetch('/.netlify/functions/ai-processor', {
            method: 'POST',
            body: JSON.stringify({ mode, payload })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Lỗi từ AI Processor');
        return data;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error; // Ném lỗi ra để các hàm gọi có thể xử lý
    }
}

// --- FEATURE HANDLERS ---
async function handleAnalysis() {
    if (transactions.length < 3) {
        showNotification('Cần ít nhất 3 giao dịch để phân tích.', 'error');
        return;
    }
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🤖 AI đang phân tích...';
    aiAnalysisResultEl.innerHTML = '<p>Vui lòng chờ...</p>';
    try {
        const data = await callAI('analyze');
        aiAnalysisResultEl.innerHTML = data.result;
    } catch (error) {
        aiAnalysisResultEl.innerHTML = `<p style="color: red;">Lỗi: ${error.message}</p>`;
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Nhờ AI Phân Tích Ngay';
    }
}

async function handleReceiptUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    uploadLabel.style.display = 'none';
    uploadSpinner.style.display = 'block';
    try {
        const imageBase64 = await toBase64(file);
        const data = await callAI('receipt', { imageBase64, mimeType: file.type });
        amountInput.value = data.totalAmount;
        noteInput.value = data.merchantName;
        const categoryExists = [...categoryInput.options].some(opt => opt.value === data.category);
        categoryInput.value = categoryExists ? data.category : 'Khác';
        showNotification('AI đã trích xuất thông tin!', 'success');
        amountInput.focus();
    } catch (error) {
        // Đã có thông báo lỗi từ callAI
    } finally {
        uploadLabel.style.display = 'inline-block';
        uploadSpinner.style.display = 'none';
        receiptUploadInput.value = '';
    }
}

function detectSubscriptions() { /* ... code không đổi ... */ }
function renderDetectedSubscriptions() { /* ... code không đổi ... */ }
async function analyzeSubscriptions() { /* ... code không đổi, chỉ cần đảm bảo nó gọi callAI('subscriptions', ...) ... */ }

async function handleGenerateChallenge() {
    generateChallengeBtn.disabled = true;
    generateChallengeBtn.textContent = 'AI đang nghĩ...';
    try {
        const data = await callAI('challenge');
        challengeTitle.textContent = data.title;
        challengeDescription.textContent = data.description;
        challengeSavings.textContent = data.estimatedSavings;
        challengeDisplay.style.display = 'block';
    } catch (error) {
        // Đã có thông báo lỗi
    } finally {
        generateChallengeBtn.disabled = false;
        generateChallengeBtn.textContent = 'Tạo Thử Thách Mới!';
    }
}

async function handleForecast() {
    forecastDemoBtn.disabled = true;
    forecastDemoBtn.textContent = 'Đang dự báo...';
    try {
        const data = await callAI('forecast');
        // Thay vì alert, hiển thị trong một modal hoặc khu vực khác sẽ đẹp hơn
        // Tạm thời vẫn dùng alert cho đơn giản
        alert(`--- DỰ BÁO TỪ AI ---\n\n${data.result}`);
    } catch (error) {
        // Đã có thông báo lỗi
    } finally {
        forecastDemoBtn.disabled = false;
        forecastDemoBtn.textContent = 'Xem Dự Báo';
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Tải dữ liệu từ DB khi trang được mở
    fetchTransactions();
    
    // Gán tất cả sự kiện
    transactionForm.addEventListener('submit', postTransaction);
    analyzeBtn.addEventListener('click', handleAnalysis);
    receiptUploadInput.addEventListener('change', handleReceiptUpload);
    // Các event listener cho Subscriptions và Challenge cần được cập nhật để gọi hàm handler mới
    // analyzeSubscriptionsBtn.addEventListener('click', handleAnalyzeSubscriptions);
    generateChallengeBtn.addEventListener('click', handleGenerateChallenge);
    forecastDemoBtn.addEventListener('click', handleForecast);
});

// Bạn cần viết lại hàm analyzeSubscriptions và các hàm detect/render của nó
// để phù hợp với kiến trúc mới. Code mẫu ở trên đã có khung sườn.
