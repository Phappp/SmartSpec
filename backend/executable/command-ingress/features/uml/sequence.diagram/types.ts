// types.ts (cho Sequence Diagram)

// Interface phản hồi đầy đủ cho một Sequence Diagram từ API
interface SequenceDiagramResponse {
  id: string;
  project_id: string;
  version_id: string;
  usecase_ref_id: string; // Tham chiếu đến Usecase mà biểu đồ này minh họa
  name: string;
  description?: string;

  // Các thành phần nghiệp vụ cốt lõi
  lifelines: any[]; // Mảng chứa các đối tượng Lifeline (đã có _id)
  messages: any[]; // Mảng chứa các đối tượng Message (đã có _id)
  fragments: any[]; // Mảng chứa các đối tượng Fragment (đã có _id)

  // Dữ liệu hiển thị (Layout JSON)
  layout_data?: any; // { nodes: [], edges: [] }

  // Metadata khác
  related_requirements: string[];
  linked_testcases: string[]; // Mảng các ID testcase
  created_by: string; // ID người tạo
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
}

// Payload gửi lên để yêu cầu LLM sinh biểu đồ
interface GenerateSequenceDiagramPayload {
  versionId: string;
  projectId: string;
  usecaseId: string; // BẮT BUỘC: ID của Usecase cần vẽ Sequence
  useCaseContext: any; // Danh sách requirements (hoặc các bước của Usecase)
  lang: string; // Ngôn ngữ ('vi-VN' hoặc 'en-US')
}

// Interface định nghĩa các phương thức của Service
interface SequenceDiagramService {
  /**
   * Sinh schema Sequence Diagram từ danh sách yêu cầu/các bước use case.
   */
  generateSchemaFromRequirements(
    payload: GenerateSequenceDiagramPayload,
    userId: string
  ): Promise<SequenceDiagramResponse>;

  /**
   * Lấy danh sách tất cả Sequence Diagrams thuộc một Version.
   */
  getSequenceDiagrams(versionId: string): Promise<SequenceDiagramResponse[]>;

  /**
   * Lấy chi tiết một Sequence Diagram theo ID.
   */
  getSequenceDiagramById(seqId: string): Promise<SequenceDiagramResponse>;

  /**
   * (Tùy chọn thêm) Lấy tất cả Sequence Diagrams của một Usecase cụ thể.
   */
  getSequenceDiagramsByUsecaseId(
    usecaseId: string
  ): Promise<SequenceDiagramResponse[]>;

  /**
   * Xóa một Sequence Diagram theo ID.
   */
  deleteSequenceDiagramById(
    ucId: string,
    sequenceId: string,
    subId: string
  ): Promise<SequenceDiagramResponse>;
}

export {
  SequenceDiagramService,
  SequenceDiagramResponse,
  GenerateSequenceDiagramPayload,
};
