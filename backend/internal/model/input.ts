import { InferSchemaType, model, Schema } from "mongoose";

const inputSchema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'projects',
    required: true
  },
  version_id: {
    type: Schema.Types.ObjectId,
    ref: 'versions',
    required: true
  },
  type: {
    type: String,
    enum: ['pdf', 'docx', 'image', 'audio', 'text'],
    required: true
  },
  original_filename: {
    type: String,
  },
  mime_type: {
    type: String,
  },
  raw_text: {
    type: String,
    required: false, // Bỏ yêu cầu bắt buộc
    default: ""      // Gán giá trị mặc định là chuỗi rỗng
  },
  file_hash: {
    type: String,
    sparse: true, // Cho phép null (với text input)
    index: true   // Tăng tốc độ tìm kiếm
  },
  text_hash: {
    type: String,
    sparse: true, // Cho phép null (với file input)
    index: true   // Tăng tốc độ tìm kiếm
  },
  // ✅ lưu paragraph + tables
  paragraphs: {
    type: [String],
    default: []
  },
  tables: {
    type: [Schema.Types.Mixed], // bảng có thể là mảng lồng nhau
    default: []
  },

  // ✅ OCR / STT nếu có
  ocr_data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  transcription_data: {
    type: Schema.Types.Mixed,
    default: {}
  },

  // ✅ metadata đầy đủ
  metadata: {
    file_path: String,
    pages: Number,
    language: String, // fallback cũ
    file_size: Number,
    is_scanned: Boolean,
    author: String,
    last_modified_by: String,
    created: Date,
    modified: Date,
    paragraphs_count: Number,
    tables_count: Number,
    headers: [String],
    footers: [String],
  },

  // ✅ tracking
  confidence_score: {
    type: Number,
    default: 0
  },
  processing_status: {
    type: String,
    enum: ['pending', 'extracted', 'processing', 'completed', 'failed'],
    default: 'pending'
  },

  // ✅ cleaned/refined
  cleaned_text: { type: String },
  language: { type: String },
  quality_score: { type: Number },
  pipeline_steps: {
    type: Schema.Types.Mixed,
    default: {}
  },
  is_processed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

type InputSchemaInferType = InferSchemaType<typeof inputSchema>;
export default model<InputSchemaInferType>("inputs", inputSchema);
