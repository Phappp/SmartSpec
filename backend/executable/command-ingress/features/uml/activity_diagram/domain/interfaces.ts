// ======================
// Node Types
// ======================
export type ActivityNodeType =
  | 'start'
  | 'end'
  | 'action'
  | 'decision'
  | 'merge'
  | 'fork'
  | 'join'
  | 'object'
  | 'swimlane';

// ======================
// NODE
// ======================
export interface ActivityNode {
  id: string;
  type: ActivityNodeType;
  label?: string;
  lane_id?: string;  // NEW
}

// ======================
// EDGE
// ======================
export interface ActivityEdge {
  from: string;
  to: string;
  condition?: string;
  guard?: string;     // NEW
  trigger?: string;   // NEW
}

// ======================
// LANE
// ======================
export interface ActivityLane {
  id: string;
  name: string;
}

// ======================
// MAIN DTO
// ======================
export interface ActivityDiagramDTO {
  uml_id?: string;  // optional if used in frontend
  name: string;
  description?: string;

  nodes: ActivityNode[];
  edges: ActivityEdge[];
  lanes?: ActivityLane[];  // NEW

  diagram_svg?: string;

  created_by?: string; // match database
}
