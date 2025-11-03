export interface PreviewChangeDto {
  change_id?: string; // tự sinh nếu không có
  entity_type:
    | "requirement"
    | "input"
    | "output"
    | "database"
    | "testcase"
    | "uml"
    | "activity_diagram"
    | "sequence_diagram"
    | "usecase_diagram";

  entity_id?: string; // có thể null nếu thêm mới
  change_type: "added" | "updated" | "deleted";
  before_snapshot?: any | null;
  after_snapshot?: any | null; 
}