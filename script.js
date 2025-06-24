// script.js - PHIÊN BẢN HOÀN CHỈNH

// --- DOM ELEMENTS ---
const notificationEl = document.getElementById('notification');
const transactionForm = document.getElementById('transactionForm');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const noteInput = document.getElementById('note');
const transactionListEl = document.getElementById('transactionList');
const totalSpentEl = document.getElementById('totalSpent');
const analyzeBtn = document.getElementById('analyzeBtn');
const aiAnalysisResultEl = document.getElementById('aiAnalysisResult');
// Upload
const receiptUploadInput = document.getElementById('receiptUpload');
const uploadLabel = document.getElementById('uploadLabel');
const uploadSpinner = document.getElementById('uploadSpinner');
// Subscriptions
const subscriptionListEl = document.getElementById('subscriptionList');
const subscriptionTotalEl = document.getElementById('subscriptionTotal');
const analyzeSubscriptionsBtn = document.getElementById('analyzeSubscriptionsBtn');
const subscriptionAdviceEl = document.getElementById('subscriptionAdvice');
// Challenges
const generateChallengeBtn = document.getElementById('generateChallengeBtn');
const challengeDisplay = document.getElementById('challengeDisplay');
const challengeTitle = document.getElementById('challengeTitle');
const challengeDescription = document.getElementById('challengeDescription');
const challengeSavings = document.getElementById('challengeSavings');
// Demos
const forecastDemoBtn = document.getElementById('forecastDemoBtn');


// --- STATE MANAGEMENT ---
let transactions = [];

// --- FUNCTIONS ---

function showNotification(message, type = 'success') {
    notificationEl.textContent = message;
    notificationEl.className = `notification show ${type}`;
    setTimeout(() => {
        notificationEl.className = 'notification';
    }, 4000);
}

function renderTransactions() {
    transactionListEl.innerHTML = '';
    let totalSpent = 0;
    if (transactions.length === 0) {
        transactionListEl.innerHTML = '<li>Chưa có giao dịch nào.</li>';
    } else {
        transactions.forEach(tx => {
            const li = document.createElement('li');
            li.innerHTML = `<div class="transaction-details"><span>${tx.category}</span><span class="transaction-note">${tx.note}</span></div><span class="transaction-amount">${tx.amount.toLocaleString('vi-VN')} VND</span>`;
            transactionListEl.appendChild(li);
            totalSpent += tx.amount;
        });
    }
    totalSpentEl.textContent = `${totalSpent.toLocaleString('vi-VN')} VND`;
    localStorage.setItem('transactions_v2', JSON.stringify(transactions));
}

function addTransaction(e) {
    e.preventDefault();
    const amount = +amountInput.value;
    const category = categoryInput.value;
    const note = noteInput.value.trim();
    if (!amount || !category) {
        showNotification('Vui lòng nhập đủ số tiền và danh mục.', 'error');
        return;
    }
    const newTransaction = { id: Date.now(), amount, category, note, date: new Date().toISOString().split('T')[0] };
    transactions.push(newTransaction);
    showNotification('Đã thêm giao dịch thành công!', 'success');
    renderTransactions();
    transactionForm.reset();
    categoryInput.value = "";
    // Chạy lại các hàm phát hiện sau khi thêm giao dịch
    renderDetectedSubscriptions();
}

// --- AI FEATURE 1: ANALYZE SPENDING ---
async function analyzeSpending() {
    if (transactions.length < 3) {
        showNotification('Cần ít nhất 3 giao dịch để AI phân tích hiệu quả.', 'error');
        return;
    }
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🤖 AI đang phân tích...';
    aiAnalysisResultEl.innerHTML = '<p>Vui lòng chờ trong giây lát...</p>';
    try {
        const response = await fetch('/.netlify/functions/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenses: transactions }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Lỗi không xác định từ máy chủ');
        aiAnalysisResultEl.innerHTML = data.analysis;
    } catch (error) {
        aiAnalysisResultEl.innerHTML = `<p style="color: red;">Lỗi: ${error.message}</p>`;
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Nhờ AI Phân Tích Ngay';
    }
}

// --- AI FEATURE 2: PROCESS RECEIPT ---
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}
async function handleReceiptUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    uploadLabel.style.display = 'none';
    uploadSpinner.style.display = 'block';
    try {
        const imageBase64 = await toBase64(file);
        const response = await fetch('/.netlify/functions/process-receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64, mimeType: file.type }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Lỗi không xác định');
        amountInput.value = data.totalAmount;
        noteInput.value = data.merchantName;
        const categoryExists = [...categoryInput.options].some(opt => opt.value === data.category);
        categoryInput.value = categoryExists ? data.category : 'Khác';
        showNotification('AI đã trích xuất thông tin!', 'success');
        amountInput.focus();
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        uploadLabel.style.display = 'inline-block';
        uploadSpinner.style.display = 'none';
        receiptUploadInput.value = '';
    }
}

// --- AI FEATURE 3: SUBSCRIPTION MANAGER ---
function detectSubscriptions() {
    const merchantMap = {};
    const subscriptions = [];
    transactions.forEach(tx => {
        const key = tx.note.toLowerCase().replace(/hanoi|hcm|vietnam/g, '').trim();
        if (!key) return;
        if (!merchantMap[key]) merchantMap[key] = [];
        merchantMap[key].push(tx);
    });
    for (const key in merchantMap) {
        const group = merchantMap[key];
        if (group.length > 1) {
            group.sort((a, b) => new Date(a.date) - new Date(b.date));
            for (let i = 0; i < group.length - 1; i++) {
                const diffDays = (new Date(group[i + 1].date) - new Date(group[i].date)) / (1000 * 60 * 60 * 24);
                if (diffDays >= 28 && diffDays <= 32) {
                    if (!subscriptions.some(sub => sub.name === group[i].note)) {
                        subscriptions.push({ name: group[i].note, amount: group[i].amount });
                    }
                }
            }
        }
    }
    return subscriptions;
}
function renderDetectedSubscriptions() {
    const detectedSubs = detectSubscriptions();
    subscriptionListEl.innerHTML = '';
    if (detectedSubs.length === 0) {
        subscriptionListEl.innerHTML = '<li>Chưa có gói nào.</li>';
        analyzeSubscriptionsBtn.style.display = 'none';
        subscriptionTotalEl.textContent = '0 VND';
        return;
    }
    let total = 0;
    detectedSubs.forEach(sub => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${sub.name}</span><strong>${sub.amount.toLocaleString('vi-VN')} VND</strong>`;
        subscriptionListEl.appendChild(li);
        total += sub.amount;
    });
    subscriptionTotalEl.textContent = `${total.toLocaleString('vi-VN')} VND`;
    analyzeSubscriptionsBtn.style.display = 'block';
}
async function analyzeSubscriptions() {
    const subscriptions = detectSubscriptions();
    if (subscriptions.length === 0) return;
    analyzeSubscriptionsBtn.disabled = true;
    analyzeSubscriptionsBtn.textContent = 'AI đang phân tích...';
    subscriptionAdviceEl.style.display = 'block';
    subscriptionAdviceEl.innerHTML = 'Vui lòng chờ...';
    try {
        const response = await fetch('/.netlify/functions/analyze-subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptions }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        subscriptionAdviceEl.innerHTML = data.advice;
    } catch (error) {
        subscriptionAdviceEl.innerHTML = `<p style="color:red;">Lỗi: ${error.message}</p>`;
    } finally {
        analyzeSubscriptionsBtn.disabled = false;
        analyzeSubscriptionsBtn.textContent = 'Tối ưu hóa';
    }
}

// --- AI FEATURE 4: SAVINGS CHALLENGE ---
async function generateChallenge() {
    if (transactions.length < 5) {
        showNotification('Cần thêm giao dịch để AI tạo thử thách phù hợp.', 'error');
        return;
    }
    generateChallengeBtn.disabled = true;
    generateChallengeBtn.textContent = 'AI đang nghĩ...';
    try {
        const response = await fetch('/.netlify/functions/generate-challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenses: transactions }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        challengeTitle.textContent = data.title;
        challengeDescription.textContent = data.description;
        challengeSavings.textContent = data.estimatedSavings;
        challengeDisplay.style.display = 'block';
    } catch (error) {
        showNotification(`Lỗi: ${error.message}`, 'error');
    } finally {
        generateChallengeBtn.disabled = false;
        generateChallengeBtn.textContent = 'Tạo Thử Thách Mới!';
    }
}

// --- FEATURE 5: DEMO FORECAST ---
function showForecastDemo() {
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const avgDaily = transactions.length > 0 ? total / transactions.length : 0;
    const projectedMonthly = avgDaily * 30;
    alert(`--- BẢN DEMO TÍNH NĂNG ---
    
Tính năng "Dự Báo Dòng Tiền" sẽ cần một cơ sở dữ liệu để hoạt động chính xác.

Dựa trên dữ liệu hiện tại, AI có thể đưa ra một dự báo đơn giản:
"Với mức chi tiêu hiện tại, dự kiến bạn sẽ chi khoảng ${projectedMonthly.toLocaleString('vi-VN')} VND trong tháng này."

Phiên bản đầy đủ sẽ cung cấp biểu đồ và cảnh báo thông minh!`);
}


// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTransactions = localStorage.getItem('transactions_v2');
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
        renderTransactions();
        renderDetectedSubscriptions();
    }
    
    // Gán tất cả sự kiện
    transactionForm.addEventListener('submit', addTransaction);
    analyzeBtn.addEventListener('click', analyzeSpending);
    receiptUploadInput.addEventListener('change', handleReceiptUpload);
    analyzeSubscriptionsBtn.addEventListener('click', analyzeSubscriptions);
    generateChallengeBtn.addEventListener('click', generateChallenge);
    forecastDemoBtn.addEventListener('click', showForecastDemo);
});
