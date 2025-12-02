import { Types } from "mongoose";
import ActivityDiagramModel from '../../../../../../internal/model/activity_diagram';
import { ActivityCoreService } from './ActivityCoreService';
import { ActivityGeminiService } from './ActivityGeminiService';
import VersionModel from '../../../../../../internal/model/version';
import Usecase from '../../../../../../internal/model/usecase';
import { VersionService } from '../../../version/domain/service';
import Project from '../../../../../../internal/model/project';
import sharp from 'sharp';

export class ActivityDiagramService {
  private core = new ActivityCoreService();
  private ai = new ActivityGeminiService();
  private versionService = new VersionService();

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

    const generated = await this.ai.generateFromUseCase([requirement], language);
    const name = generated?.name || `${requirement.name || 'Usecase'} - Activity`;
    const lanes = generated.lanes;
    const nodes = generated?.nodes || [{ id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' }];
    const edges = generated?.edges || [{ from: 'n_start', to: 'n_end' }];
    const diagram_svg = this.core.renderSvg({ name, nodes: nodes as any, edges: edges as any });

    const newDiagram = await ActivityDiagramModel.create({
      project_id: version.project_id,
      version_id: versionId,
      lang: language,
      name,
      description: generated?.description || 'Generated from requirement',
      lanes,
      nodes,
      edges,
      diagram_svg,
      created_by: userId ? new Types.ObjectId(userId) : undefined,
    } as any);

    // ✅ Tạo preview change cho activity diagram mới
    if (userId && versionId) {
      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "activity_diagram",
          entity_id: newDiagram._id.toString(),
          change_type: "added",
          before_snapshot: null,
          after_snapshot: newDiagram.toObject()
        }
      );
    }

    return newDiagram;
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

    const generated = await this.ai.generateFromUseCase(requirements, language);
    const name = generated?.name || `${actor} - Activity`;
    const lanes = generated.lanes;
    const nodes = generated?.nodes || [{ id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' }];
    const edges = generated?.edges || [{ from: 'n_start', to: 'n_end' }];
    const diagram_svg = this.core.renderSvg({ name, nodes: nodes as any, edges: edges as any });

    const newDiagram = await ActivityDiagramModel.create({
      project_id: version.project_id,
      version_id: versionId,
      lang: language,
      name,
      description: generated?.description || 'Generated from actor requirements',
      lanes,
      nodes,
      edges,
      diagram_svg,
      created_by: userId ? new Types.ObjectId(userId) : undefined,
    } as any);

    // ✅ Tạo preview change cho activity diagram mới
    if (userId && versionId) {
      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "activity_diagram",
          entity_id: newDiagram._id.toString(),
          change_type: "added",
          before_snapshot: null,
          after_snapshot: newDiagram.toObject()
        }
      );
    }

    return newDiagram;
  }


  public async create(
    projectId: string,
    versionId: string,
    lang: string,
    name: string,
    description?: string,
    userId?: string
  ): Promise<any> {
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error('Không tìm thấy version');

    const newDiagram = await ActivityDiagramModel.create({
      project_id: projectId,
      version_id: versionId,
      lang: lang,
      name,
      description: description || '',
      lanes: [],
      nodes: [{ id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' }],
      edges: [{ from: 'n_start', to: 'n_end' }],
      diagram_svg: '',
      created_by: userId ? new Types.ObjectId(userId) : undefined,
    } as any);

    // ✅ Tạo preview change cho activity diagram mới
    if (userId && versionId) {
      await this.versionService.createOrUpdatePreview(
        versionId,
        userId,
        {
          entity_type: "activity_diagram",
          entity_id: newDiagram._id.toString(),
          change_type: "added",
          before_snapshot: null,
          after_snapshot: newDiagram.toObject()
        }
      );
    }

    return newDiagram;
  }

  public async getListActivityDiagram(versionId: string) {
    if (versionId) {
      return ActivityDiagramModel.find({ version_id: versionId }).lean();
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
    }).populate('project_id').lean();

    if (diagrams.length === 0) {
      throw new Error("Không tìm thấy activity diagram để xóa");
    }

    // Lấy project IDs từ các diagrams
    const projectIds = diagrams.map(d => d.project_id).filter((v, i, a) => a.indexOf(v) === i);

    // Lấy các projects liên quan
    const projects = await Project.find({ _id: { $in: projectIds } })
      .lean();

    // Kiểm tra quyền cho từng diagram
    for (const diagram of diagrams) {
      const project = projects.find(p => p._id.toString() === (diagram.project_id as any)?.toString());
      if (!project) {
        throw new Error(`Không tìm thấy project liên quan cho diagram ${diagram._id}`);
      }

      // Kiểm tra nếu project có thông tin members
      if (project.members) {
        const userMember = project.members.find(
          (member: any) => member.user_id.toString() === userId
        );

        console.log("User attempting deletion:", userMember);

        if (!userMember || userMember.status !== "accepted") {
          throw new Error("Unauthorized - User is not a member of this project");
        }

        if (!["owner", "editor"].includes(userMember.role)) {
          throw new Error("Only owner or editor can delete activity diagrams");
        }
      } else {
        // Fallback: nếu không có cấu trúc members, kiểm tra created_by
        if (diagram.created_by?.toString() !== userId) {
          throw new Error("Only owner or editor can delete activity diagrams");
        }
      }
    }

    // Lấy versionId từ diagram đầu tiên để tạo preview
    const versionId = diagrams[0]?.version_id?.toString();

    // Xóa khỏi database sau khi đã xác thực quyền
    const result = await ActivityDiagramModel.deleteMany({
      _id: { $in: ids.map(i => new Types.ObjectId(i)) }
    });

    // ✅ Tạo preview change cho mỗi diagram đã xóa
    if (versionId && userId && result.deletedCount > 0) {
      for (const diagram of diagrams) {
        await this.versionService.createOrUpdatePreview(
          versionId,
          userId,
          {
            entity_type: "activity_diagram",
            entity_id: diagram._id.toString(),
            change_type: "deleted",
            before_snapshot: diagram,
            after_snapshot: null
          }
        );
      }
    }

    return { deletedCount: result.deletedCount || 0 };
  }

  public async updateNodePosition(
    diagramId: string,
    nodeId: string,
    position: { x: number; y: number }
  ): Promise<any> {
    const diagram = await ActivityDiagramModel.findById(diagramId);
    if (!diagram) {
      throw new Error("Activity Diagram not found");
    }

    const nodeIndex = diagram.nodes.findIndex(
      (node: any) => node.id === nodeId
    );
    if (nodeIndex === -1) {
      throw new Error("Node not found");
    }

    // ✅ Gán trực tiếp position (vì nodeSchema không có _id, không thể dùng set())
    if (!diagram.nodes[nodeIndex].position) {
      diagram.nodes[nodeIndex].position = { x: 0, y: 0 };
    }
    diagram.nodes[nodeIndex].position.x = position.x;
    diagram.nodes[nodeIndex].position.y = position.y;

    // ✅ Mark nodes array as modified để đảm bảo Mongoose lưu thay đổi nested object
    diagram.markModified('nodes');
    await diagram.save();

    return this.getActivityDiagramByID(diagramId);
  }

  public async updateMultipleNodePositions(
    diagramId: string,
    updates: { id: string; position: { x: number; y: number } }[]
  ): Promise<any> {
    const diagram = await ActivityDiagramModel.findById(diagramId);
    if (!diagram) {
      throw new Error("Activity Diagram not found");
    }

    // Cập nhật positions cho nodes
    if (updates && updates.length > 0) {
      updates.forEach(({ id, position }) => {
        const nodeIndex = diagram.nodes.findIndex(
          (node: any) => node.id === id
        );
        if (nodeIndex !== -1) {
          // ✅ Gán trực tiếp position (vì nodeSchema không có _id, không thể dùng set())
          if (!diagram.nodes[nodeIndex].position) {
            diagram.nodes[nodeIndex].position = { x: 0, y: 0 };
          }
          diagram.nodes[nodeIndex].position.x = position.x;
          diagram.nodes[nodeIndex].position.y = position.y;
        }
      });

      // ✅ Mark nodes array as modified để đảm bảo Mongoose lưu thay đổi nested object
      diagram.markModified('nodes');
      await diagram.save();
    }

    return this.getActivityDiagramByID(diagramId);
  }

}


