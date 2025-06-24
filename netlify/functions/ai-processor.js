const { Pool } = require('pg');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Các hàm tạo prompt
const getAnalysisPrompt = (expenses) => `Bạn là chuyên gia tài chính "Ví Thông Minh AI". Dựa vào dữ liệu chi tiêu sau, hãy đưa ra nhận xét tổng quan, chỉ ra điểm đáng chú ý và 3 lời khuyên cụ thể bằng Markdown tiếng Việt.\nDữ liệu: ${JSON.stringify(expenses)}`;
const getSubscriptionPrompt = (subs) => `Bạn là chuyên gia tối ưu hóa chi phí. Dựa vào danh sách đăng ký sau, hãy nhận xét, tìm điểm tối ưu (trùng lặp, gói family) và đặt câu hỏi gợi mở bằng Markdown tiếng Việt.\nDanh sách: ${JSON.stringify(subs)}`;
const getChallengePrompt = (expenses) => `Bạn là HLV tài chính. Dựa vào chi tiêu sau, tạo một thử thách tiết kiệm 5-7 ngày, ước tính số tiền tiết kiệm được. Trả lời dưới dạng JSON {"title": "", "description": "", "estimatedSavings": ""}.\nDữ liệu: ${JSON.stringify(expenses)}`;
const getForecastPrompt = (stats) => `Bạn là nhà dự báo tài chính. Dựa vào các thống kê sau đây, hãy đưa ra một dự báo dòng tiền cho tháng tới, bao gồm cảnh báo và gợi ý. Giọng văn chuyên nghiệp, động viên. Dùng Markdown tiếng Việt.\nThống kê: ${JSON.stringify(stats)}`;
const getReceiptPrompt = () => `Phân tích hình ảnh hóa đơn này và trích xuất totalAmount (số), merchantName (chuỗi), category (chuỗi từ danh sách: Ăn uống, Di chuyển, Mua sắm, Giải trí, Hóa đơn, Sức khỏe, Khác). Trả lời dưới dạng JSON.\nVí dụ: {"totalAmount": 75000, "merchantName": "Circle K", "category": "Mua sắm"}`;

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') return { statusCode: 405 };

    try {
        const { mode, payload } = JSON.parse(event.body);
        let prompt;
        let content = [];

        if (mode === 'analyze' || mode === 'challenge') {
            const result = await pool.query('SELECT amount, category, note FROM transactions ORDER BY date DESC LIMIT 100');
            prompt = mode === 'analyze' ? getAnalysisPrompt(result.rows) : getChallengePrompt(result.rows);
            content = [prompt];
        } else if (mode === 'subscriptions') {
            prompt = getSubscriptionPrompt(payload.subscriptions);
            content = [prompt];
        } else if (mode === 'receipt') {
            prompt = getReceiptPrompt();
            const imagePart = { inlineData: { data: payload.imageBase64, mimeType: payload.mimeType } };
            content = [prompt, imagePart];
        } else if (mode === 'forecast') {
            const statsResult = await pool.query(`
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(amount) as total_spent,
                    AVG(amount) as avg_transaction_value,
                    (SELECT category FROM transactions GROUP BY category ORDER BY SUM(amount) DESC LIMIT 1) as top_category
                FROM transactions WHERE date > NOW() - INTERVAL '30 days';
            `);
            prompt = getForecastPrompt(statsResult.rows[0]);
            content = [prompt];
        } else {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid mode' }) };
        }

        const result = await model.generateContent({ contents: [{ parts: content }] });
        const responseText = result.response.text();
        
        // Trả về JSON cho các mode cần JSON
        if (mode === 'receipt' || mode === 'challenge') {
             const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
             return { statusCode: 200, body: cleanedJson };
        }
        
        return { statusCode: 200, body: JSON.stringify({ result: responseText }) };

    } catch (error) {
        console.error("Lỗi trong ai-processor:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
