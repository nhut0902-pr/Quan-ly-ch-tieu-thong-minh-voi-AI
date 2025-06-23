// netlify/functions/analyze.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Lấy API Key từ biến môi trường của Netlify
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Cấu trúc bắt buộc của một Netlify Function
exports.handler = async function(event) {
    // Chỉ chấp nhận phương thức POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // Lấy dữ liệu chi tiêu từ front-end gửi lên
        const { expenses } = JSON.parse(event.body);

        if (!expenses || expenses.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Không có dữ liệu chi tiêu để phân tích." })
            };
        }

        const prompt = `
            Bạn là một chuyên gia tư vấn tài chính cá nhân tên là "Ví Thông Minh AI", giọng văn thân thiện, động viên và chuyên nghiệp.
            Dựa trên danh sách chi tiêu của người dùng dưới đây, hãy thực hiện các yêu cầu sau:

            1.  **Nhận xét tổng quan (2-3 dòng):** Đưa ra một nhận xét ngắn gọn về thói quen chi tiêu của họ.
            2.  **Điểm sáng & Điểm cần lưu ý:** Chỉ ra 1-2 danh mục chi tiêu chiếm tỷ trọng cao nhất và một vài khoản chi bất thường (nếu có).
            3.  **Lời khuyên Vàng (3 gạch đầu dòng):** Đưa ra 3 lời khuyên cụ thể, hữu ích và có thể hành động ngay để giúp họ tiết kiệm hiệu quả hơn. Ví dụ: "Giảm tần suất ăn ngoài từ 5 lần/tuần xuống 3 lần/tuần có thể giúp bạn tiết kiệm X tiền".
            4.  **Dự báo vui:** Dựa trên mức chi tiêu này, đưa ra một dự báo nhỏ, ví dụ: "Nếu tiếp tục đà này, bạn đang đi đúng hướng để đạt mục tiêu Y!" hoặc "Cẩn thận, ví tiền của bạn có thể sẽ 'mỏng' đi vào cuối tháng đấy!".

            Hãy trả lời bằng tiếng Việt và sử dụng định dạng Markdown để dễ đọc (tiêu đề in đậm, gạch đầu dòng).

            Dữ liệu chi tiêu của người dùng:
            ${JSON.stringify(expenses, null, 2)}
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Trả kết quả thành công về cho front-end
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysis: text })
        };

    } catch (error) {
        console.error("Lỗi trong Netlify Function:", error);
        // Trả lỗi về cho front-end
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Đã có lỗi xảy ra từ phía máy chủ AI." })
        };
    }
};
