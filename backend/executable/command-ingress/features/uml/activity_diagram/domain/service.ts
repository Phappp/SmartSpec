import ActivityDiagramModel from '../../../../../../internal/model/activity_diagram';
import UmlModel from '../../../../../../internal/model/uml';
import { ActivityCoreService } from './ActivityCoreService';
import { ActivityGeminiService } from './ActivityGeminiService';
import VersionModel from '../../../../../../internal/model/version';
import { Types } from "mongoose";
import sharp from 'sharp';

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
    const lanes = generated.lanes;
    const nodes = generated?.nodes || [ { id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' } ];
    const edges = generated?.edges || [ { from: 'n_start', to: 'n_end' } ];
    const diagram_svg = this.core.renderSvg({ name, nodes: nodes as any, edges: edges as any });

    return await ActivityDiagramModel.create({
      uml_id: uml._id.toString(),
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
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error('Không tìm thấy version');
    const requirements = ((version.requirement_model || []) as any[]).filter(r => (r.role || '').toLowerCase() === actor.toLowerCase());
    if (!requirements.length) throw new Error('Không có requirement nào cho actor này');
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
    const generated = await this.ai.generateFromUseCase(requirements, language);
    const name = generated?.name || `${actor} - Activity`;
    const lane = generated.lanes;
    const nodes = generated?.nodes || [ { id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' } ];
    const edges = generated?.edges || [ { from: 'n_start', to: 'n_end' } ];
    const diagram_svg = this.core.renderSvg({ name, nodes: nodes as any, edges: edges as any });

    return await ActivityDiagramModel.create({
      uml_id: uml._id.toString(),
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
  public async deleteActivityDiagram(id: string | string[]): Promise<{ deletedCount: number }> {
    if (!id) throw new Error("Chưa cung cấp id để xóa activity diagram");

    const ids = Array.isArray(id) ? id : [id];

    // Xóa khỏi database
    const result = await ActivityDiagramModel.deleteMany({ _id: { $in: ids.map(i => new Types.ObjectId(i)) } });
    
    return { deletedCount: result.deletedCount || 0 };
  }

}


