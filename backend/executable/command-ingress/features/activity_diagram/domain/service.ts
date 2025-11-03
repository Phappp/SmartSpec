import ActivityDiagramModel from '../../../../../internal/model/activity_diagram';
import UmlModel from '../../../../../internal/model/uml';
import { ActivityCoreService } from './ActivityCoreService';
import { ActivityGeminiService } from './ActivityGeminiService';
import { ActivityDiagramDTO } from './interfaces';
import UsecaseDiagramModel from '../../../../../internal/model/usecase_diagram';
import VersionModel from '../../../../../internal/model/version';
import { Types } from "mongoose";

type NodeDto = {
  id: string;
  type: 'start' | 'action' | 'decision' | 'merge' | 'end';
  label?: string;
}

type EdgeDto = {
  from: string;
  to: string;
  condition?: string;
}

type CreatePayload = {
  uml_id: string;
  name: string;
  description?: string;
  nodes?: NodeDto[];
  edges?: EdgeDto[];
  diagram_svg?: string;
  linked_usecase?: string;
}

export class ActivityDiagramService {
  private core = new ActivityCoreService();
  private ai = new ActivityGeminiService();

  public async generateFromUsecase(requirementId: string, language: string, versionId?: string, userId?: string) {
    if (!versionId) throw new Error('versionId là bắt buộc để lấy requirement model');
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error('Không tìm thấy version');
    const requirements = (version.requirement_model || []) as any[];
    const requirement = requirements.find(r => r.id === requirementId);
    if (!requirement) throw new Error('Không tìm thấy requirement theo id');

    let uml = await UmlModel.findOne({ version_id: new Types.ObjectId(versionId) }).lean();

    if (!uml) {
      const newUml = await UmlModel.create({
        project_id: version.project_id,
        version_id: versionId,
        name: "Default UML Diagram",
        description: "Auto-generated UML for version " + versionId,
        created_by: userId ? new Types.ObjectId(userId) : undefined,
        updated_by: userId ? new Types.ObjectId(userId) : undefined,
      });
      // Trả về plain object (giống .lean())
      uml = newUml.toObject();
    }
    const generated = await this.ai.generateFromUseCase([requirement], language);
    const name = generated?.name || `${requirement.name || 'Usecase'} - Activity`;
    const nodes = generated?.nodes || [ { id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' } ];
    const edges = generated?.edges || [ { from: 'n_start', to: 'n_end' } ];
    const diagram_svg = this.core.renderSvg({ name, nodes: nodes as any, edges: edges as any });

    return await ActivityDiagramModel.create({
      uml_id: uml._id.toString(),
      name,
      description: generated?.description || 'Generated from requirement',
      nodes,
      edges,
      diagram_svg,
      //linked_usecase
      userId,
    } as any);
  }

  public async generateFromActor(versionId: string, actor: string, language: string) {
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error('Không tìm thấy version');
    const requirements = ((version.requirement_model || []) as any[]).filter(r => (r.role || '').toLowerCase() === actor.toLowerCase());
    if (!requirements.length) throw new Error('Không có requirement nào cho actor này');
    const uml = await UmlModel.findOne({ version_id: versionId }).lean();
    if (!uml) throw new Error('Không tìm thấy UML liên kết với version');

    const generated = await this.ai.generateFromUseCase(requirements, language);
    const name = generated?.name || `${actor} - Activity`;
    const nodes = generated?.nodes || [ { id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' } ];
    const edges = generated?.edges || [ { from: 'n_start', to: 'n_end' } ];
    const diagram_svg = this.core.renderSvg({ name, nodes: nodes as any, edges: edges as any });

    return await ActivityDiagramModel.create({
      uml_id: uml._id.toString(),
      name,
      description: generated?.description || 'Generated from actor requirements',
      nodes,
      edges,
      diagram_svg,
    } as any);
  }

  public async listRequirementsByVersion(versionId: string) {
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error('Không tìm thấy version');
    const requirements = (version.requirement_model || []) as any[];
    const actors = Array.from(new Set(requirements.map(r => r.role).filter(Boolean)));
    return { actors, requirements };
  }

  // Diagram-level CRUD operations
  public async addNode(id: string, node: any) {
    const doc = await ActivityDiagramModel.findByIdAndUpdate(id, { $push: { nodes: node } }, { new: true }).lean();
    return doc;
  }
  public async updateNode(id: string, nodeId: string, node: any) {
    const doc: any = await ActivityDiagramModel.findById(id);
    if (!doc) throw new Error('Diagram not found');
    const idx = (doc.nodes || []).findIndex((n: any) => n.id === nodeId);
    if (idx === -1) throw new Error('Node not found');
    doc.nodes[idx] = { ...doc.nodes[idx].toObject?.() || doc.nodes[idx], ...node, id: nodeId };
    await doc.save();
    return doc.toObject();
  }
  public async removeNode(id: string, nodeId: string) {
    const doc = await ActivityDiagramModel.findByIdAndUpdate(id, { $pull: { nodes: { id: nodeId } } }, { new: true }).lean();
    return doc;
  }
  public async addEdge(id: string, edge: any) {
    const doc = await ActivityDiagramModel.findByIdAndUpdate(id, { $push: { edges: edge } }, { new: true }).lean();
    return doc;
  }
  public async updateEdge(id: string, index: number, edge: any) {
    const doc: any = await ActivityDiagramModel.findById(id);
    if (!doc) throw new Error('Diagram not found');
    if (!doc.edges || index < 0 || index >= doc.edges.length) throw new Error('Edge index out of range');
    doc.edges[index] = { ...(doc.edges[index].toObject?.() || doc.edges[index]), ...edge };
    await doc.save();
    return doc.toObject();
  }
  public async removeEdge(id: string, index: number) {
    const doc: any = await ActivityDiagramModel.findById(id);
    if (!doc) throw new Error('Diagram not found');
    if (!doc.edges || index < 0 || index >= doc.edges.length) throw new Error('Edge index out of range');
    doc.edges.splice(index, 1);
    await doc.save();
    return doc.toObject();
  }
  public async updateSvg(id: string, svg: string) {
    const doc = await ActivityDiagramModel.findByIdAndUpdate(id, { diagram_svg: svg }, { new: true }).lean();
    return doc;
  }

  public async list(query: { umlId?: string; versionId?: string; projectId?: string }) {
    if (query.umlId) {
      return ActivityDiagramModel.find({ uml_id: query.umlId }).lean();
    }
    if (query.versionId) {
      const umls = await UmlModel.find({ version_id: query.versionId }).select('_id');
      const ids = umls.map(u => u._id);
      return ActivityDiagramModel.find({ uml_id: { $in: ids } }).lean();
    }
    if (query.projectId) {
      const umls = await UmlModel.find({ project_id: query.projectId }).select('_id');
      const ids = umls.map(u => u._id);
      return ActivityDiagramModel.find({ uml_id: { $in: ids } }).lean();
    }
    return ActivityDiagramModel.find().lean();
  }

  public async getById(id: string) {
    return ActivityDiagramModel.findById(id).lean();
  }

  public async create(payload: CreatePayload) {
    return ActivityDiagramModel.create(payload);
  }

  public async update(id: string, payload: Partial<CreatePayload>) {
    return ActivityDiagramModel.findByIdAndUpdate(id, payload, { new: true }).lean();
  }

  public async remove(id: string) {
    const res = await ActivityDiagramModel.findByIdAndDelete(id);
    return !!res;
  }

  public async validateStructure(id: string) {
    const diagram = await ActivityDiagramModel.findById(id).lean();
    if (!diagram) throw new Error('Không tìm thấy activity diagram');
    return this.core.validate(diagram.nodes as any, diagram.edges as any);
  }

  public async exportSvg(id: string) {
    const diagram = await ActivityDiagramModel.findById(id).lean();
    if (!diagram) return '';
    if (diagram.diagram_svg) return diagram.diagram_svg as unknown as string;
    // render on the fly if missing
    return this.core.renderSvg({ name: diagram.name, nodes: diagram.nodes as any, edges: diagram.edges as any });
  }
}


