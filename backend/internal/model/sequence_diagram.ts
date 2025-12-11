// models/sequenceDiagram.model.ts
import { Schema, model, InferSchemaType } from "mongoose";

/**
 * 1. Lifelines (Đường đời)
 * Tương đương với 'actorSchema' trong Usecase.
 * Đây là các đối tượng tham gia tương tác.
 */
const lifelineSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // Ví dụ: "Khách hàng" hoặc ":OrderController"
    description: String,
  },
  { _id: true } // <-- Bật _id để messages có thể tham chiếu đến _id này
);

/**
 * 2. Fragments (Các khối logic)
 * Ví dụ: 'loop', 'alt' (if/else), 'opt' (optional)
 */
const fragmentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["loop", "alt", "opt", "par", "region", "else"], // par: song song, region: critical
      required: true,
    },
    guard_condition: { type: String, default: "" }, // Ví dụ: "[Thanh toán thành công]" hoặc "For each item"

    // Dùng để lồng các fragment, ví dụ khối 'else' thuộc 'alt'
    // Sẽ trỏ đến _id của một fragment khác trong MẢNG 'fragments'
    parent_fragment_id: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: true } // <-- Bật _id để messages có thể tham chiếu đến _id này
);

/**
 * 3. Messages (Thông điệp)
 * Tương đương với 'associationSchema' hoặc 'relationshipSchema'
 * Đây là các mũi tên tương tác.
 */
const messageSchema = new Schema(
  {
    // Tham chiếu đến _id của một 'lifeline' trong MẢNG 'lifelines'
    source_lifeline_id: { type: Schema.Types.ObjectId, required: true },
    // Tham chiếu đến _id của một 'lifeline' trong MẢNG 'lifelines'
    target_lifeline_id: { type: Schema.Types.ObjectId, required: true },

    order: { type: Number, required: true }, // Thứ tự của thông điệp (1, 2, 3...)
    content: { type: String, required: true }, // Nội dung: "submitOrder(orderInfo)"
    type: {
      type: String,
      enum: ["sync", "async", "reply", "create", "destroy"], // sync (mũi tên đặc), async (mũi tên hở), reply (nét đứt)
      required: true,
    },

    // ID của fragment chứa nó (nếu có), trỏ đến _id trong MẢNG 'fragments'
    fragment_id: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: true }
);

/**
 * 4. Schema chính (Sequence Diagram)
 * Cấu trúc tương tự 'usecaseDiagramSchema'
 */
const sequenceDiagramSchema = new Schema(
  {
    // Thông tin dự án và phiên bản (Giống Usecase model)
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "projects",
      required: true,
    },
    version_id: {
      type: Schema.Types.ObjectId,
      ref: "versions",
      required: true,
    },
    // Thông tin biểu đồ
    name: { type: String, required: true }, // Ví dụ: "Kịch bản Thanh toán Thành công"
    description: String,
    
    // Logic của 1 Sequence Diagram là nó minh họa cho 1 Usecase
    // Chúng ta nên lưu ID của usecase đó (giả sử usecase_id này là duy nhất trong dự án)
    // Đây là cách đơn giản nhất để liên kết mà không cần SSOT đầy đủ
    usecase_ref_id: { type: String, index: true }, // Ví dụ: "UC-01" hoặc một ID nào đó bạn dùng để định danh usecase

    // Dữ liệu nghiệp vụ (Nhúng trực tiếp, giống Usecase model)
    lifelines: [lifelineSchema],
    messages: [messageSchema],
    fragments: [fragmentSchema],

    // Dữ liệu hiển thị (View/Cache - "Cách 3" của bạn)
    // Tương đương với trường 'diagram_svg' của bạn, nhưng lưu JSON cấu trúc
    layout_data: {
      type: Schema.Types.Mixed, // Dùng Mixed để lưu JSON tự do (nodes, edges)
      default: { nodes: [], edges: [] },
    },

    // Metadata (Giống Usecase model)
    related_requirements: [String],
    created_by: { type: Schema.Types.ObjectId, ref: "users" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

type SequenceDiagramInferType = InferSchemaType<typeof sequenceDiagramSchema>;
export default model<SequenceDiagramInferType>(
  "sequence_diagrams",
  sequenceDiagramSchema
);