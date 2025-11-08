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
    const height = 1600;

    const nodes = diagram.nodes || [];
    let edges = diagram.edges || [];

    // 0) Remove edges to missing nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    edges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));

    // 1) BFS Layering Top-Down
    const startNode = nodes.find(n => n.type === "start");
    if (!startNode) throw new Error("Missing start node");

    const layerMap: Record<string, number> = {};
    nodes.forEach(n => layerMap[n.id] = Infinity);
    layerMap[startNode.id] = 0;

    const queue = [startNode.id];
    while(queue.length){
      const curr = queue.shift()!;
      const currLayer = layerMap[curr];
      edges.filter(e=>e.from===curr).forEach(e=>{
        if(layerMap[e.to] > currLayer+1){
          layerMap[e.to] = currLayer+1;
          queue.push(e.to);
        }
      });
    }

    // Assign end nodes max layer+1
    const maxLayer = Math.max(...Object.values(layerMap));
    nodes.filter(n=>n.type==='end').forEach(n=>layerMap[n.id]=maxLayer+1);

    // Build layers
    const layers: string[][] = [];
    Object.entries(layerMap).forEach(([id, layer])=>{
      if(!layers[layer]) layers[layer]=[];
      layers[layer].push(id);
    });

    // 2) Calculate positions
    const positions: Record<string,{x:number,y:number,w:number,h:number}>={};
    const centerX = width/2;
    layers.forEach((layerNodes, idx)=>{
      const y = 80 + idx*150;
      const nodeBoxes = layerNodes.map(id=>{
        const label = nodes.find(n=>n.id===id)?.label || id;
        const w = Math.max(80, label.length*7+20);
        const h = 36;
        return {id,w,h};
      });
      const gap = 30;
      const totalWidth = nodeBoxes.reduce((a,b)=>a+b.w,0) + gap*(nodeBoxes.length-1);
      let startX = centerX - totalWidth/2;
      nodeBoxes.forEach(b=>{
        positions[b.id] = {x: startX+b.w/2, y, w:b.w, h:b.h};
        startX += b.w + gap;
      });
    });

    // 3) Node render
    const nodeEls = nodes.map(n=>{
      const p = positions[n.id];
      if(!p) return "";
      const label = n.label || n.id;
      let shape="";
      switch(n.type){
        case "start": shape=`<rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" rx="18" ry="18" fill="#22c55e" stroke="#0f5132" stroke-width="2"/>`; break;
        case "end": shape=`<rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" rx="18" ry="18" fill="#ef4444" stroke="#7f1d1d" stroke-width="2"/>`; break;
        case "decision": shape=`<rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" rx="6" ry="6" fill="#fde68a" stroke="#b45309" stroke-width="2"/>`; break;
        case "merge": shape=`<rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" fill="#e5e7eb" stroke="#111"/>`; break;
        default: shape=`<rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" rx="8" ry="8" fill="#fff" stroke="#111"/>`;
      }
      return `<g>${shape}<text x="${p.x}" y="${p.y}" font-size="12" text-anchor="middle" alignment-baseline="middle" fill="#111">${label}</text></g>`;
    }).join("\n");

    // 4) Edge render: góc vuông + mũi tên cuối + chữ giữa
    const edgeCountMap: Record<string,number>={};
    const edgeEls = edges.map(e=>{
      const from = positions[e.from], to=positions[e.to];
      if(!from||!to) return "";
      const key = `${e.from}->${e.to}`;
      const count = edgeCountMap[key]||0;
      edgeCountMap[key]=count+1;
      const offset = count*10;
      const startX = from.x;
      const startY = from.y + from.h/2 + 4 + offset;
      const endX = to.x;
      const endY = to.y - to.h/2 - 4 - offset;
      const midY = startY + (endY-startY)/2;
      const textX = (startX+endX)/2;
      const textY = midY-6;
      const pathD = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
      return `<g><path d="${pathD}" fill="none" stroke="#555" stroke-width="1.4" marker-end="url(#arrow)"/>${e.condition?`<text x="${textX}" y="${textY}" font-size="11" text-anchor="middle" fill="#374151">${e.condition}</text>`:""}</g>`;
    }).join("\n");

    // 5) Final SVG
    return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="#555"/>
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="#fafafa"/>
    <text x="20" y="30" font-size="18" font-weight="bold" fill="#111">${diagram.name}</text>
    ${edgeEls}
    ${nodeEls}
  </svg>`;
  }
}


