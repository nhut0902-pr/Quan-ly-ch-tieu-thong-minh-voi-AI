// netlify/functions/analyze-subscriptions.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.handler = async function(event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { subscriptions } = JSON.parse(event.body);

        if (!subscriptions || subscriptions.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Không có gói đăng ký nào để phân tích." })
            };
        }

        const prompt = `
            Bạn là một chuyên gia tối ưu hóa chi phí. Dưới đây là danh sách các gói dịch vụ đăng ký hàng tháng của một người dùng.
            Nhiệm vụ của bạn là:
            1.  Đưa ra một nhận xét ngắn gọn về tổng chi phí cho các gói đăng ký này.
            2.  Phát hiện các điểm có thể tối ưu:
                - Có dịch vụ nào bị trùng lặp không? (Ví dụ: có cả Spotify và YouTube Music).
                - Có dịch vụ nào có gói "Gia đình" (Family plan) rẻ hơn nếu dùng chung không?
                - Đưa ra 1-2 câu hỏi gợi mở để người dùng suy nghĩ về mức độ cần thiết của từng dịch vụ. (Ví dụ: "Bạn có thực sự sử dụng hết các tính năng của gói... không?").
            3.  Trình bày lời khuyên một cách ngắn gọn, thân thiện và dễ hành động. Sử dụng định dạng Markdown.

            Danh sách gói đăng ký:
            ${JSON.stringify(subscriptions, null, 2)}
        `;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ advice: responseText })
        };

    } catch (error) {
        console.error("Lỗi trong analyze-subscriptions function:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "AI không thể phân tích các gói đăng ký." })
        };
    }
};
