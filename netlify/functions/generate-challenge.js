// netlify/functions/generate-challenge.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

exports.handler = async function(event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { expenses } = JSON.parse(event.body);

        if (!expenses || expenses.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Không có dữ liệu để tạo thử thách." })
            };
        }

        const prompt = `
            Bạn là một huấn luyện viên tài chính đầy nhiệt huyết. Dựa vào danh sách chi tiêu của người dùng, hãy làm các việc sau:
            1.  Xác định một danh mục chi tiêu không thiết yếu nhưng chiếm tỷ trọng cao (ví dụ: Ăn uống, Giải trí, Mua sắm).
            2.  Tạo ra một thử thách tiết kiệm vui vẻ, cụ thể, kéo dài 5-7 ngày liên quan đến danh mục đó.
            3.  Ước tính số tiền họ có thể tiết kiệm được nếu hoàn thành thử thách.
            
            Hãy trả lời CHÍNH XÁC dưới dạng một đối tượng JSON với 3 khóa: "title", "description", và "estimatedSavings".
            Ví dụ:
            {"title": "Thử Thách 5 Ngày Tự Nấu Ăn", "description": "AI nhận thấy bạn chi khá nhiều cho việc ăn ngoài. Hãy thử tự nấu ăn trong 5 ngày tới, bạn sẽ bất ngờ với tài nghệ và số tiền tiết kiệm được đấy!", "estimatedSavings": "Khoảng 300.000đ - 500.000đ"}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const cleanedJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const challengeData = JSON.parse(cleanedJsonString);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(challengeData)
        };

    } catch (error) {
        console.error("Lỗi trong generate-challenge function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "AI không thể tạo thử thách lúc này." })
        };
    }
};
