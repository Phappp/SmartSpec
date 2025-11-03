import { ActivityDiagramDTO, ActivityEdge, ActivityNode } from './interfaces';

export class ActivityCoreService {
  validate(nodes: ActivityNode[] = [], edges: ActivityEdge[] = []) {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map(n => n.id));
    const starts = nodes.filter(n => n.type === 'start');
    const ends = nodes.filter(n => n.type === 'end');
    if (starts.length !== 1) errors.push('Sơ đồ phải có đúng 1 nút Start.');
    if (ends.length < 1) errors.push('Sơ đồ phải có ít nhất 1 nút End.');
    for (const e of edges) {
      if (!nodeIds.has(e.from)) errors.push(`Cạnh from=${e.from} không tồn tại node.`);
      if (!nodeIds.has(e.to)) errors.push(`Cạnh to=${e.to} không tồn tại node.`);
    }
    return { valid: errors.length === 0, errors };
  }

  // very naive SVG renderer for quick preview
  renderSvg(diagram: Pick<ActivityDiagramDTO, 'nodes' | 'edges' | 'name'>): string {
    const width = 800;
    const height = 600;
    const nodeRadius = 20;

    const positions: Record<string, { x: number; y: number }> = {};
    const nodes = diagram.nodes || [];
    const edges = diagram.edges || [];
    const colCount = Math.max(1, nodes.length);
    nodes.forEach((n, idx) => {
      positions[n.id] = { x: 60 + (idx % colCount) * 120, y: 80 + Math.floor(idx / colCount) * 80 };
    });

    const nodeEls = nodes.map(n => {
      const p = positions[n.id] || { x: 50, y: 50 };
      const label = n.label || n.type;
      const isTerminal = n.type === 'start' || n.type === 'end';
      return `\n<g>\n ${isTerminal ? `<circle cx="${p.x}" cy="${p.y}" r="${nodeRadius}" fill="${n.type === 'start' ? '#22c55e' : '#ef4444'}" />` : `<rect x="${p.x - 40}" y="${p.y - 20}" width="80" height="40" rx="6" ry="6" fill="#fff" stroke="#111"/>`}\n <text x="${p.x}" y="${p.y + 4}" font-size="12" text-anchor="middle">${label}</text>\n</g>`;
    }).join('');

    const edgeEls = edges.map(e => {
      const a = positions[e.from] || { x: 0, y: 0 };
      const b = positions[e.to] || { x: 0, y: 0 };
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      return `\n<g>\n <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#555" marker-end="url(#arrow)"/>\n ${e.condition ? `<text x="${mx}" y="${my - 6}" font-size="11" text-anchor="middle">${e.condition}</text>` : ''}\n</g>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#555"/></marker></defs>\n<rect width="100%" height="100%" fill="#fafafa"/>\n<text x="16" y="24" font-size="14" fill="#111">${diagram.name || 'Activity Diagram'}</text>\n${edgeEls}\n${nodeEls}\n</svg>`;
  }
}


