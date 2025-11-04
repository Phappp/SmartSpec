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

  renderSvg(diagram: Pick<ActivityDiagramDTO, 'nodes' | 'edges' | 'name'>): string {
    const width = 1200;
    const height = 800;

    const nodes = diagram.nodes || [];
    const edges = diagram.edges || [];

    // ---- 1️⃣ Gán vị trí tự động (simple vertical flow layout)
    const positions: Record<string, { x: number; y: number }> = {};
    const colSpacing = 200;
    const rowSpacing = 100;
    let layer = 0;

    // sắp theo loại: start, action, decision, merge, end
    const typeOrder = ["start", "action", "decision", "merge", "end"];
    const sortedNodes = [...nodes].sort(
      (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
    );

    sortedNodes.forEach((n, i) => {
      const x = 200 + (i % 4) * colSpacing;
      const y = 100 + Math.floor(i / 4) * rowSpacing;
      positions[n.id] = { x, y };
    });

    // ---- 2️⃣ Render các node
    const nodeEls = sortedNodes.map((n) => {
      const p = positions[n.id];
      const label = n.label || n.id;
      let shape = "";

      switch (n.type) {
        case "start":
          shape = `<circle cx="${p.x}" cy="${p.y}" r="20" fill="#22c55e" stroke="#0f5132" stroke-width="2"/>`;
          break;
        case "end":
          shape = `<circle cx="${p.x}" cy="${p.y}" r="20" fill="#ef4444" stroke="#7f1d1d" stroke-width="2"/>`;
          break;
        case "decision":
          shape = `<polygon points="${p.x},${p.y - 25} ${p.x + 25},${p.y} ${p.x},${p.y + 25} ${p.x - 25},${p.y}" fill="#fde68a" stroke="#b45309" stroke-width="2"/>`;
          break;
        case "merge":
          shape = `<rect x="${p.x - 40}" y="${p.y - 10}" width="80" height="20" rx="2" ry="2" fill="#e5e7eb" stroke="#111"/>`;
          break;
        default: // action
          shape = `<rect x="${p.x - 50}" y="${p.y - 20}" width="100" height="40" rx="8" ry="8" fill="#ffffff" stroke="#111" stroke-width="1.5" />`;
      }

      return `
        <g>
          ${shape}
          <text x="${p.x}" y="${p.y + 5}" font-size="12" text-anchor="middle" fill="#111">${label}</text>
        </g>
      `;
    }).join("\n");

    // ---- 3️⃣ Render các cạnh (edge) với đường cong
    const edgeEls = edges.map((e) => {
      const a = positions[e.from];
      const b = positions[e.to];
      if (!a || !b) return "";

      const curvature = 0.2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const ctrlX = a.x + dx * curvature;
      const ctrlY = a.y + dy * curvature;

      const labelX = (a.x + b.x) / 2;
      const labelY = (a.y + b.y) / 2 - 10;

      return `
        <g>
          <path d="M ${a.x} ${a.y} Q ${ctrlX} ${ctrlY}, ${b.x} ${b.y}"
                fill="none" stroke="#555" stroke-width="1.6"
                marker-end="url(#arrow)" />
          ${
            e.condition
              ? `<text x="${labelX}" y="${labelY}" font-size="11" text-anchor="middle" fill="#374151">${e.condition}</text>`
              : ""
          }
        </g>
      `;
    }).join("\n");

    // ---- 4️⃣ Kết hợp SVG
    return `<?xml version="1.0" encoding="UTF-8"?>
    <svg xmlns="http://www.w3.org/2000/svg"
        width="${width}" height="${height}"
        viewBox="0 0 ${width} ${height}">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill="#555"/>
        </marker>
      </defs>

      <rect width="100%" height="100%" fill="#fafafa"/>
      <text x="20" y="30" font-size="18" font-weight="bold" fill="#111">
        ${diagram.name || "Activity Diagram"}
      </text>

      ${edgeEls}
      ${nodeEls}
    </svg>`;
  }
}


