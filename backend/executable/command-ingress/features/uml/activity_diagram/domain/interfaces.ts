export type ActivityNodeType = 'start' | 'action' | 'decision' | 'merge' | 'end';

export interface ActivityNode {
  id: string;
  type: ActivityNodeType;
  label?: string;
}

export interface ActivityEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface ActivityDiagramDTO {
  name: string;
  description?: string;
  nodes: ActivityNode[];
  edges: ActivityEdge[];
  diagram_svg?: string;
}


