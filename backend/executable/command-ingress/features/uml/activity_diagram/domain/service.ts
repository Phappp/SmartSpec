import { Types } from "mongoose";
import ActivityDiagramModel from '../../../../../../internal/model/activity_diagram';
import UmlModel from '../../../../../../internal/model/uml';
import { ActivityCoreService } from './ActivityCoreService';
import { ActivityGeminiService } from './ActivityGeminiService';
import VersionModel from '../../../../../../internal/model/version';
import Usecase from '../../../../../../internal/model/usecase';
import sharp from 'sharp';

export class ActivityDiagramService {
  private core = new ActivityCoreService();
  private ai = new ActivityGeminiService();

  public async generateFromUsecase(requirementId: string, language: string, versionId?: string, userId?: string) {
    if (!versionId) throw new Error('versionId là bắt buộc để lấy requirement model');
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error('Không tìm thấy version');
    
    // Lấy usecase từ collection - handle cả _id và id (backward compatibility)
    // Normalize requirementId (handle ObjectId string, plain string, etc.)
    let normalizedRequirementId = requirementId;
    if (Types.ObjectId.isValid(String(requirementId))) {
      normalizedRequirementId = new Types.ObjectId(requirementId).toString();
    }
    
    let requirement = await Usecase.findOne({ 
      $or: [
        { _id: new Types.ObjectId(requirementId) },
        { _id: requirementId },
        { _id: normalizedRequirementId },
        { id: requirementId }
      ],
      version_id: versionId 
    }).lean();
    
    if (!requirement) {
      // Try one more time with string comparison
      const allUsecases = await Usecase.find({ version_id: versionId }).lean();
      requirement = allUsecases.find(uc => 
        String(uc._id) === String(requirementId) || 
        String(uc._id) === normalizedRequirementId ||
        (uc._id && String(uc._id) === String(requirementId))
      );
    }
    
    if (!requirement) {
      const availableUsecases = await Usecase.find({ version_id: versionId }).select('_id name').lean();
      console.error('❌ Activity Diagram: Requirement not found:', {
        requirementId,
        normalizedRequirementId,
        versionId,
        availableUsecases: availableUsecases.map(uc => ({
          _id: String(uc._id),
          name: uc.name
        }))
      });
      throw new Error(`Không tìm thấy requirement theo id: ${requirementId}. Available usecases: ${availableUsecases.length}`);
    }

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
    const nodes = generated?.nodes || [{ id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' }];
    const edges = generated?.edges || [{ from: 'n_start', to: 'n_end' }];
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

  public async generateFromActor(versionId: string, actor: string, language: string, userId?: string) {
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error('Không tìm thấy version');
    
    // Lấy usecases từ collection theo role
    const requirements = await Usecase.find({ 
      version_id: versionId,
      "role.name": { $regex: new RegExp(`^${actor}$`, 'i') }
    }).lean();
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
    const nodes = generated?.nodes || [{ id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' }];
    const edges = generated?.edges || [{ from: 'n_start', to: 'n_end' }];
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
    if (versionId) {
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
  public async deleteActivityDiagram(
    id: string | string[],
    userId: string
  ): Promise<{ deletedCount: number }> {
    if (!id) throw new Error("Chưa cung cấp id để xóa activity diagram");
    if (!userId) throw new Error("User ID là bắt buộc để xác thực quyền");

    const ids = Array.isArray(id) ? id : [id];

    // Lấy tất cả activity diagrams cần xóa
    const diagrams = await ActivityDiagramModel.find({
      _id: { $in: ids.map(i => new Types.ObjectId(i)) }
    }).lean();

    if (diagrams.length === 0) {
      throw new Error("Không tìm thấy activity diagram để xóa");
    }

    // Lấy UML IDs từ các diagrams
    const umlIds = diagrams.map(d => d.uml_id).filter((v, i, a) => a.indexOf(v) === i);

    // Lấy các UML documents liên quan
    const umls = await UmlModel.find({ _id: { $in: umlIds } })
      .populate('project_id')
      .lean();

    // Kiểm tra quyền cho từng diagram
    for (const diagram of diagrams) {
      const uml = umls.find(u => u._id.toString() === diagram.uml_id.toString());
      if (!uml) {
        throw new Error(`Không tìm thấy UML liên quan cho diagram ${diagram._id}`);
      }

      // Kiểm tra nếu project có thông tin members
      const project = uml.project_id as any;
      if (project && project.members) {
        const userMember = project.members.find(
          (member: any) => member.user_id.toString() === userId
        );

        console.log("User attempting deletion:", userMember);

        if (!userMember || userMember.status !== "accepted") {
          throw new Error("Unauthorized - User is not a member of this project");
        }

        if (!["owner", "editor"].includes(userMember.role)) {
          throw new Error("Only owner or editor can delete usecase diagrams");
        }
      } else {
        // Fallback: nếu không có cấu trúc members, kiểm tra created_by
        if (uml.created_by?.toString() !== userId) {
          throw new Error("Only owner or editor can delete usecase diagrams");
        }
      }
    }

    // Xóa khỏi database sau khi đã xác thực quyền
    const result = await ActivityDiagramModel.deleteMany({
      _id: { $in: ids.map(i => new Types.ObjectId(i)) }
    });

    return { deletedCount: result.deletedCount || 0 };
  }

}


