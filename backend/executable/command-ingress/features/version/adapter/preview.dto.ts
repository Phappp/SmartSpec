export interface PreviewChangeDto {
  change_id?: string;
  entity_type:
    | "requirement"
    | "input"
    | "output"
    | "database"
    | "table"
    | "column"
    | "relationship"
    | "testcase"
    | "uml"
    | "activity_diagram"
    | "sequence_diagram"
    | "usecase_diagram";

  entity_id?: string;
  change_type: "added" | "updated" | "deleted";
  before_snapshot?: any | null;
  after_snapshot?: any | null; 
}