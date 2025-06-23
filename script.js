// script.js

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

// --- STATE MANAGEMENT ---
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
    // Lưu vào localStorage để không mất dữ liệu khi tải lại trang
    localStorage.setItem('transactions_v2', JSON.stringify(transactions));
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
 * Gửi dữ liệu đến Netlify Function để nhận phân tích
 */
async function analyzeSpending() {
    if (transactions.length < 3) {
        showNotification('Cần ít nhất 3 giao dịch để AI phân tích hiệu quả.', 'error');
        return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🤖 AI đang phân tích...';
    aiAnalysisResultEl.innerHTML = '<p>Vui lòng chờ trong giây lát...</p>';

    try {
        // Gọi đến Netlify Function của chúng ta
        const response = await fetch('/.netlify/functions/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expenses: transactions }), // Gửi dữ liệu lên cho function
        });
        
        const data = await response.json();

        if (!response.ok) {
            // Nếu có lỗi từ function, ném lỗi để bắt ở catch
            throw new Error(data.error || 'Lỗi không xác định từ máy chủ');
        }

        // Sử dụng một thư viện Markdown (như marked.js) sẽ hiển thị đẹp hơn,
        // nhưng hiện tại dùng pre-wrap cũng đã đủ tốt.
        aiAnalysisResultEl.innerHTML = data.analysis.replace(/```/g, ''); // Xóa các dấu ``` nếu có

    } catch (error) {
        console.error("Lỗi khi gọi Netlify Function:", error);
        aiAnalysisResultEl.innerHTML = `<p style="color: red;">Lỗi: ${error.message}</p>`;
        showNotification('Lỗi phân tích từ AI.', 'error');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Nhờ AI Phân Tích Ngay';
    }
}

// --- EVENT LISTENERS & INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Tải dữ liệu từ localStorage nếu có
    const savedTransactions = localStorage.getItem('transactions_v2');
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
        renderTransactions();
    }
    
    // Gán sự kiện
    transactionForm.addEventListener('submit', addTransaction);
    analyzeBtn.addEventListener('click', analyzeSpending);
});
