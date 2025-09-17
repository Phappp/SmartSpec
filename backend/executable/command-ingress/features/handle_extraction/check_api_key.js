var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
function testGeminiKey(apiKey) {
    return __awaiter(this, void 0, void 0, function () {
        var client, model, resp, text, err_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    console.log('🔑 Testing Gemini API key:', apiKey.slice(0, 10) + '...');
                    client = new GoogleGenerativeAI(apiKey);
                    model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
                    return [4 /*yield*/, model.generateContent({
                            contents: [{ role: 'user', parts: [{ text: 'Hello, kiểm tra API key!' }] }]
                        })];
                case 1:
                    resp = _c.sent();
                    text = (_b = (_a = resp === null || resp === void 0 ? void 0 : resp.response) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.call(_a);
                    if (text) {
                        console.log('✅ API key hoạt động. Response:', text);
                        return [2 /*return*/, true];
                    }
                    else {
                        console.log('⚠️ API key có vẻ không trả về response.');
                        return [2 /*return*/, false];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _c.sent();
                    console.error('❌ API key không hoạt động:', err_1.message || err_1);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Dùng hàm
testGeminiKey('AIzaSyDfEAUmJMmtFzk8ZNpG0aftY9kjMT1qB3M')
    .then(function (success) {
    console.log('Test result:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
});
