// netlify/functions/process-receipt.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
// Sử dụng model gemini-1.5-flash vì nó cũng hỗ trợ đa phương thức (hình ảnh) và nhanh
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Hàm chuyển đổi dữ liệu từ stream của Netlify thành buffer
async function streamToBuffer(readableStream) {
    const chunks = [];
    for await (const chunk of readableStream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}


exports.handler = async function(event) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // Gemini cần 2 thông tin: Dữ liệu ảnh dưới dạng base64 và loại mime (image/jpeg, image/png)
        const { imageBase64, mimeType } = JSON.parse(event.body);

        if (!imageBase64 || !mimeType) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Thiếu dữ liệu hình ảnh hoặc mime type." })
            };
        }

        const prompt = `
            Bạn là một trợ lý nhập liệu tài chính thông minh.
            Nhiệm vụ của bạn là phân tích hình ảnh hóa đơn này và trích xuất các thông tin sau:
            1.  **totalAmount**: Tổng số tiền cuối cùng phải trả. Chỉ trả về một con số, không có ký tự tiền tệ hay dấu phẩy.
            2.  **merchantName**: Tên cửa hàng hoặc nơi cung cấp dịch vụ.
            3.  **category**: Đề xuất một danh mục phù hợp nhất từ danh sách sau: Ăn uống, Di chuyển, Mua sắm, Giải trí, Hóa đơn, Sức khỏe, Khác.

            Hãy trả lời CHÍNH XÁC dưới dạng một đối tượng JSON. Ví dụ:
            {"totalAmount": 75000, "merchantName": "Highlands Coffee", "category": "Giải trí"}
        `;

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        // Làm sạch và parse kết quả JSON từ AI
        const cleanedJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(cleanedJsonString);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(extractedData)
        };

    } catch (error) {
        console.error("Lỗi trong process-receipt function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "AI không thể xử lý hình ảnh này." })
        };
    }
};
