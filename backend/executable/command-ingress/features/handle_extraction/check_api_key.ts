const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiKey(apiKey: string) {
    try {
        console.log('🔑 Testing Gemini API key:', apiKey.slice(0, 10) + '...');

        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Gửi prompt đơn giản để kiểm tra key
        const resp = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Hello, kiểm tra API key!' }] }]
        });

        const text = resp?.response?.text?.();
        if (text) {
            console.log('✅ API key hoạt động. Response:', text);
            return true;
        } else {
            console.log('⚠️ API key có vẻ không trả về response.');
            return false;
        }
    } catch (err) {
        console.error('❌ API key không hoạt động:', err.message || err);
        return false;
    }
}

// Dùng hàm
testGeminiKey('AIzaSyAb35MUhwXIr1wC0YFrGV2YWTvSYIYaGv0')
    .then(success => {
        console.log('Test result:', success ? 'SUCCESS' : 'FAILED');
        process.exit(success ? 0 : 1);
    });
