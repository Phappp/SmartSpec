export interface ExtractionResult {
    project_id: string;                // ObjectId string
    version_id: string;                // ObjectId string
    type: "pdf" | "docx" | "image" | "audio" | "text";
    original_filename: string;
    mime_type: string;
    raw_text: string | null;
    confidence_score: number;
    processing_status: "completed" | "failed" | "pending" | "extracted";

    paragraphs?: string[];
    tables?: any[];
    // Unified structured segments for OCR/STT when available
    segments?: any[];

    metadata?: {
        pages?: number;
        language?: string;
        file_size?: number;
        author?: string;
        title?: string;
        subject?: string;
        keywords?: string;
        created?: Date | string;
        modified?: Date | string;
        error?: string;
    };

    file_hash?: string;
    text_hash?: string;
    is_processed?: boolean;

    createdAt?: Date;
    updatedAt?: Date;
    documentId?: string; // _id sau khi insert DB
    error?: string;      // để debug nếu extract fail
}
