import ActivityDiagramModel from '../../../../../../internal/model/activity_diagram';
import UmlModel from '../../../../../../internal/model/uml';
import { ActivityCoreService } from './ActivityCoreService';
import { ActivityGeminiService } from './ActivityGeminiService';
import VersionModel from '../../../../../../internal/model/version';
import ProjectModel from '../../../../../../internal/model/project';
import { Types } from "mongoose";
import sharp from 'sharp';

export class ActivityDiagramService {
  private core = new ActivityCoreService();
  private ai = new ActivityGeminiService();

  public async generateFromUsecase(requirementId: string, language: string, versionId: string, userId?: string) {
    if (!userId) throw new Error("Missing userId to authenticate");
    if (!versionId) throw new Error("versionId is required to get requirement model");
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error("Version not found");
    const project = await ProjectModel.findById(version.project_id).lean();
    if (!project) throw new Error("Project not found");
    // Tìm member
    const member = (project.members || []).find(
      (m) => m.user_id.toString() === userId && m.status === 'accepted'
    );

    if (!member) throw new Error("You are not a member of the project");

    if (!['editor', 'owner'].includes(member.role)) {
      throw new Error("You do not have permission to perform this action.");
    }
    const requirements = (version.requirement_model || []) as any[];
    const requirement = requirements.find(r => r.id === requirementId);
    if (!requirement) throw new Error("Requirement not found by id");

    const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
    const generated = await this.ai.generateFromUseCase([requirement], lang);
    const name = generated?.name || `${requirement.name || 'Usecase'} - Activity`;
    const lanes = generated.lanes;
    const nodes = generated?.nodes || [ { id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' } ];
    const edges = generated?.edges || [ { from: 'n_start', to: 'n_end' } ];
    const diagram_svg = this.core.renderSvg({ name, nodes: nodes as any, edges: edges as any });

    return await ActivityDiagramModel.create({
      project_id: project._id,
      version_id: versionId,
      lang,
      name,
      description: generated?.description || 'Generated from requirement',
      lanes,
      nodes,
      edges,
      diagram_svg,
      userId,
    } as any);
  }

  public async generateFromActor( versionId: string,actor: string, language: string,userId?: string) {
    if (!userId) throw new Error("Missing userId to authenticate");
    if (!versionId) throw new Error("versionId is required to get requirement model");
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error("Version not found");
    const project = await ProjectModel.findById(version.project_id).lean();
    if (!project) throw new Error("Project not found");
    // Tìm member
    const member = (project.members || []).find(
      (m) => m.user_id.toString() === userId && m.status === 'accepted'
    );

    if (!member) throw new Error("You are not a member of the project");

    if (!['editor', 'owner'].includes(member.role)) {
      throw new Error("You do not have permission to perform this action.");
    }
    const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
    const requirements = ((version.requirement_model || []) as any[]).filter(r => (r.role || '').toLowerCase() === actor.toLowerCase());
    if (!requirements.length) throw new Error('Không có requirement nào cho actor này');
    const generated = await this.ai.generateFromUseCase(requirements, lang);
    const name = generated?.name || `${actor} - Activity`;
    const lane = generated.lanes;
    const nodes = generated?.nodes || [ { id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' } ];
    const edges = generated?.edges || [ { from: 'n_start', to: 'n_end' } ];
    const diagram_svg = this.core.renderSvg({ name, nodes: nodes as any, edges: edges as any });

    return await ActivityDiagramModel.create({
      project_id: project._id,
      version_id: versionId,
      lang,
      name,
      description: generated?.description || 'Generated from actor requirements',
      lane,
      nodes,
      edges,
      diagram_svg,
      userId,
    } as any);
  }

  
  public async getListActivityDiagram(versionId: string) {
    if (versionId){
      const umls = await UmlModel.find({ version_id: versionId }).select('_id');
      const ids = umls.map(u => u._id);
      return ActivityDiagramModel.find({ uml_id: { $in: ids } }).lean();
    }
    return ActivityDiagramModel.find().lean();
  }

  public async getActivityDiagramByID(id: string) {
    return ActivityDiagramModel.findById(id).lean();
  }
  
  public async validateStructure(id: string) {
    const diagram = await ActivityDiagramModel.findById(id).lean();
    if (!diagram) throw new Error('Không tìm thấy activity diagram');
    return this.core.validate(diagram.nodes as any, diagram.edges as any);
  }

  public async export(id: string): Promise<Buffer | null> {
    const diagram = await ActivityDiagramModel.findById(id).lean();
    if (!diagram) return null;

    let svg: string;
    if (diagram.diagram_svg) {
      svg = diagram.diagram_svg as unknown as string;
    } else {
      svg = this.core.renderSvg({
        name: diagram.name,
        nodes: diagram.nodes as any,
        edges: diagram.edges as any
      });
    }

    // Convert SVG to PNG
    try {
      const pngBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();
      return pngBuffer;
    } catch (error) {
      console.error('Error converting SVG to PNG:', error);
      return null;
    }
  }
  
  public async deleteActivityDiagram(id: string | string[],userId: string): Promise<{ deletedCount: number }> {
    if (!id) throw new Error("No activity diagram ID provided");
    if (!userId) throw new Error("Missing userId for authorization");
    const ids = Array.isArray(id) ? id : [id];
    // 1. Fetch diagrams before deleting
    const diagrams = await ActivityDiagramModel.find({
      _id: { $in: ids.map(i => new Types.ObjectId(i)) }
    }).lean();
    if (!diagrams || diagrams.length === 0) {
      throw new Error("Activity diagram not found");
    }
    
    const project = await ProjectModel.findById(diagrams[0].project_id).lean();
    if (!project) throw new Error("Project not found");

    // 4. Permission check (must be owner or editor)
    const member = (project.members || []).find(
      (m) => m.user_id.toString() === userId && m.status === 'accepted'
    );

    if (!member && project.owner_id.toString() !== userId) {
      throw new Error("You are not a member of the project");
    }

    if (!["owner", "editor"].includes(member.role!)) {
      throw new Error("You do not have permission to delete activity diagrams.");
    }

    // 5. Delete diagrams
    const result = await ActivityDiagramModel.deleteMany({
      _id: { $in: ids.map(i => new Types.ObjectId(i)) }
    });

    return { deletedCount: result.deletedCount || 0 };
  }
}


