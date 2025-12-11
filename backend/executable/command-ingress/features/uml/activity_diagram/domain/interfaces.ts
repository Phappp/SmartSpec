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
  lane_id?: string;
}

// ======================
// EDGE
// ======================
export interface ActivityEdge {
  from: string;
  to: string;
  condition?: string;
  guard?: string;       
  trigger?: string;    
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
  project_id?: string;
  version_id?: string;
  name: string;
  description?: string;
  lanes?: ActivityLane[]; 
  nodes: ActivityNode[];
  edges: ActivityEdge[];

  created_by?: string;
}
