import { Types } from "mongoose";
import ActivityDiagramModel from '../../../../../../internal/model/activity_diagram';
import { ActivityCoreService } from './ActivityCoreService';
import { ActivityGeminiService } from './ActivityGeminiService';
import VersionModel from '../../../../../../internal/model/version';
import Usecase from '../../../../../../internal/model/usecase';
import { VersionService } from '../../../version/domain/service';
import { LogService } from '../../../log/domain/service';
import Project from '../../../../../../internal/model/project';
import User from '../../../../../../internal/model/user';
import sharp from 'sharp';
import { umlSocketService } from '../../domain/uml.socket.service';

export class ActivityDiagramService {
  private core = new ActivityCoreService();
  private ai = new ActivityGeminiService();
  private versionService = new VersionService();
  private logService = new LogService();

  public async generateFromUsecase(requirementId: string, language: string, versionId?: string, userId?: string) {
    // ✅ Khai báo version ở ngoài try để có thể dùng trong catch
    let version: any = null;

    try {
      if (!versionId) {
        const errorMsg = 'versionId is required to get requirement model';
        throw new Error(errorMsg);
      }
      version = await VersionModel.findById(versionId).lean();
      if (!version) {
        const errorMsg = 'Version not found';
        if (umlSocketService && versionId && userId) {
          // Cannot emit without projectId
        }
        throw new Error(errorMsg);
      }

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
        const errorMsg = `Requirement not found with id: ${requirementId}. Available usecases: ${availableUsecases.length}`;
        if (umlSocketService && version.project_id && versionId && userId) {
          umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
      }

      // Emit start event
      if (umlSocketService && version.project_id && versionId && userId) {
        umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 10, 'generating', true);
      }

      const generated = await this.ai.generateFromUseCase([requirement], language, userId, version.project_id?.toString());

      // ✅ Validate generated data - không dùng fallback
      if (!generated || !generated.nodes || generated.nodes.length === 0) {
        const errorMsg = 'Failed to generate activity diagram. No nodes were generated.';
        if (umlSocketService && version.project_id && versionId && userId) {
          umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
      }

      const name = generated.name || `${requirement.name || 'Usecase'} - Activity`;
      const lanes = generated.lanes || [];
      const nodes = generated.nodes;
      const edges = generated.edges || [];

      const newDiagram = await ActivityDiagramModel.create({
        project_id: version.project_id,
        version_id: versionId,
        name,
        description: generated?.description || 'Generated from requirement',
        lanes,
        nodes,
        edges,
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

      // Emit completion event
      if (umlSocketService && version.project_id && versionId && userId) {
        umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 100, 'completed', false);
      }

      return newDiagram;
    } catch (error: any) {
      console.error('❌ Error generating activity diagram from usecase:', error);
      // Emit failed event với error message
      if (versionId && userId) {
        try {
          const version = await VersionModel.findById(versionId).lean();
          if (version && umlSocketService && version.project_id) {
            const errorMsg = error.message || 'Failed to generate activity diagram';
            umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 100, 'failed', false, [errorMsg]);
          }
        } catch (emitError) {
          console.error('❌ Error emitting failed event:', emitError);
        }
      }
      throw error; // Re-throw để controller xử lý
    }
  }

  public async generateFromActor(versionId: string, actor: string, language: string, userId?: string) {
    try {
      const version = await VersionModel.findById(versionId).lean();
      if (!version) {
        const errorMsg = 'Version not found';
        if (umlSocketService && version?.project_id && versionId && userId) {
          umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
      }

      // Lấy usecases từ collection theo actor (hỗ trợ cả actor mới và role cũ)
      const requirements = await Usecase.find({
        version_id: versionId,
        $or: [
          { "actor.name": { $regex: new RegExp(`^${actor}$`, 'i') } }, // Model mới: actor.name
          { "role.name": { $regex: new RegExp(`^${actor}$`, 'i') } }   // Model cũ: role.name (backward compatibility)
        ]
      }).lean();
      if (!requirements.length) {
        const errorMsg = 'No requirements found for this actor';
        if (umlSocketService && version.project_id && versionId && userId) {
          umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
      }

      // Emit start event
      if (umlSocketService && version.project_id && versionId && userId) {
        umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 10, 'generating', true);
      }

      const generated = await this.ai.generateFromUseCase(requirements, language, userId, version.project_id?.toString());

      // ✅ Validate generated data - không dùng fallback
      if (!generated || !generated.nodes || generated.nodes.length === 0) {
        const errorMsg = 'Failed to generate activity diagram. No nodes were generated.';
        if (umlSocketService && version.project_id && versionId && userId) {
          umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 100, 'failed', false, [errorMsg]);
        }
        throw new Error(errorMsg);
      }

      const name = generated.name || `${actor} - Activity`;
      const lanes = generated.lanes || [];
      const nodes = generated.nodes;
      const edges = generated.edges || [];

      const newDiagram = await ActivityDiagramModel.create({
        project_id: version.project_id,
        version_id: versionId,
        name,
        description: generated?.description || 'Generated from actor requirements',
        lanes,
        nodes,
        edges,
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

      // Emit completion event
      if (umlSocketService && version.project_id && versionId && userId) {
        umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 100, 'completed', false);
      }

      // ✅ Ghi log cho generate activity diagram from actor
      try {
        if (userId) {
          const user = await User.findById(userId).lean();
          const username = user?.name || "Unknown User";
          await this.logService.createLog({
            project_id: version.project_id.toString(),
            user_id: userId,
            action: "generate_output",
            target_id: newDiagram._id.toString(),
            target_type: "activity_diagrams",
            version_number: version.version_number,
            affects_requirement: true,
            level: "info",
            performed_by_ai: true,
            details: {
              after: { name: newDiagram.name, actor: actor },
              message: `${username} generated activity diagram "${newDiagram.name}" from actor "${actor}"`
            }
          });
        }
      } catch (logError) {
        console.error("❌ Error logging activity diagram generation:", logError);
      }

      return newDiagram;
    } catch (error: any) {
      console.error('❌ Error generating activity diagram from actor:', error);
      // Emit failed event với error message
      if (versionId && userId) {
        try {
          const version = await VersionModel.findById(versionId).lean();
          if (version && umlSocketService && version.project_id) {
            const errorMsg = error.message || 'Failed to generate activity diagram';
            umlSocketService.emitProgress(version.project_id.toString(), versionId, userId, 'activity', 100, 'failed', false, [errorMsg]);
          }
        } catch (emitError) {
          console.error('❌ Error emitting failed event:', emitError);
        }
      }
      throw error; // Re-throw để controller xử lý
    }
  }


  public async create(
    projectId: string,
    versionId: string,
    name: string,
    description?: string,
    userId?: string
  ): Promise<any> {
    const version = await VersionModel.findById(versionId).lean();
    if (!version) throw new Error('Không tìm thấy version');

    const newDiagram = await ActivityDiagramModel.create({
      project_id: projectId,
      version_id: versionId,
      name,
      description: description || '',
      lanes: [],
      nodes: [{ id: 'n_start', type: 'start', label: 'Start' }, { id: 'n_end', type: 'end', label: 'End' }],
      edges: [{ from: 'n_start', to: 'n_end' }],
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

    // ✅ Ghi log cho create activity diagram
    try {
      if (userId) {
        const version = await VersionModel.findById(versionId).lean();
        if (version) {
          const user = await User.findById(userId).lean();
          const username = user?.name || "Unknown User";
          await this.logService.createLog({
            project_id: projectId,
            user_id: userId,
            action: "generate_output",
            target_id: newDiagram._id.toString(),
            target_type: "activity_diagrams",
            version_number: version.version_number,
            affects_requirement: false,
            level: "info",
            performed_by_ai: false,
            details: {
              after: { name: newDiagram.name },
              message: `${username} created activity diagram "${newDiagram.name}"`
            }
          });
        }
      }
    } catch (logError) {
      console.error("❌ Error logging activity diagram creation:", logError);
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

    const svg = this.core.renderSvg({
      name: diagram.name,
      nodes: diagram.nodes as any,
      edges: diagram.edges as any
    });

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

    // Lấy tất cả activity diagrams cần xóa (không populate để tránh lỗi nếu project không tồn tại)
    const diagrams = await ActivityDiagramModel.find({
      _id: { $in: ids.map(i => new Types.ObjectId(i)) }
    }).lean();

    if (diagrams.length === 0) {
      throw new Error("Không tìm thấy activity diagram để xóa");
    }

    // Kiểm tra quyền cho từng diagram
    for (const diagram of diagrams) {
      // Lấy project_id từ diagram (xử lý cả trường hợp populate và không populate)
      let projectId: Types.ObjectId | null = null;

      // Xử lý project_id từ diagram
      if (diagram.project_id) {
        // Nếu đã được populate (có _id property)
        if (typeof diagram.project_id === 'object' && (diagram.project_id as any)._id) {
          projectId = new Types.ObjectId((diagram.project_id as any)._id.toString());
        }
        // Nếu là ObjectId trực tiếp
        else if (diagram.project_id instanceof Types.ObjectId) {
          projectId = diagram.project_id;
        }
        // Nếu là string hoặc có toString method
        else if (diagram.project_id) {
          projectId = new Types.ObjectId(String(diagram.project_id));
        }
      }

      // Nếu không có project_id, thử lấy từ version_id
      if (!projectId && diagram.version_id) {
        const version = await VersionModel.findById(diagram.version_id).select('project_id').lean();
        if (version && version.project_id) {
          projectId = new Types.ObjectId(version.project_id.toString());
        }
      }

      if (!projectId) {
        throw new Error(`Không tìm thấy project_id cho diagram ${diagram._id}`);
      }

      // Lấy project từ database
      const project = await Project.findById(projectId).lean();
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

      // ✅ Ghi log cho delete activity diagrams
      try {
        const version = await VersionModel.findById(versionId).lean();
        if (version) {
          const user = await User.findById(userId).lean();
          const username = user?.name || "Unknown User";
          for (const diagram of diagrams) {
            await this.logService.createLog({
              project_id: (diagram.project_id as any)?.toString() || version.project_id.toString(),
              user_id: userId,
              action: "delete_output",
              target_id: diagram._id.toString(),
              target_type: "activity_diagrams",
              version_number: version.version_number,
              affects_requirement: false,
              level: "warning",
              details: {
                before: diagram,
                message: `${username} deleted activity diagram "${diagram.name}"`
              }
            });
          }
        }
      } catch (logError) {
        console.error("❌ Error logging activity diagram deletion:", logError);
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

    // Tìm node bằng _id (ObjectId) hoặc id (string) để backward compatibility
    const nodeIndex = diagram.nodes.findIndex(
      (node: any) => {
        const nodeIdStr = node._id ? node._id.toString() : (node.id || '');
        const searchIdStr = Types.ObjectId.isValid(nodeId)
          ? new Types.ObjectId(nodeId).toString()
          : nodeId;
        return nodeIdStr === searchIdStr || node.id === nodeId;
      }
    );
    if (nodeIndex === -1) {
      throw new Error("Node not found");
    }

    // ✅ Gán trực tiếp position
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
        // Tìm node bằng _id (ObjectId) hoặc id (string) để backward compatibility
        const nodeIndex = diagram.nodes.findIndex(
          (node: any) => {
            const nodeIdStr = node._id ? node._id.toString() : (node.id || '');
            const searchIdStr = Types.ObjectId.isValid(id)
              ? new Types.ObjectId(id).toString()
              : id;
            return nodeIdStr === searchIdStr || node.id === id;
          }
        );
        if (nodeIndex !== -1) {
          // ✅ Gán trực tiếp position
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

  // ==================== NODE CRUD ====================
  public async updateNode(
    diagramId: string,
    nodeId: string,
    data: { label?: string; type?: string; lane_id?: string | null }
  ): Promise<any> {
    const diagram = await ActivityDiagramModel.findById(diagramId);
    if (!diagram) {
      throw new Error("Activity Diagram not found");
    }

    const normalizedNodeId = String(nodeId);
    const nodeIndex = diagram.nodes.findIndex(
      (node: any) => {
        const nodeIdStr = node._id ? String(node._id) : String(node.id || '');
        return nodeIdStr === normalizedNodeId;
      }
    );

    if (nodeIndex === -1) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const { Types } = await import("mongoose");

    if (data.label !== undefined) {
      diagram.nodes[nodeIndex].label = data.label;
    }
    if (data.type !== undefined) {
      (diagram.nodes[nodeIndex] as any).type = data.type as "start" | "end" | "action" | "decision" | "merge" | "fork" | "join" | "object" | "swimlane";
    }
    if (data.lane_id !== undefined) {
      diagram.nodes[nodeIndex].lane_id = data.lane_id
        ? new Types.ObjectId(data.lane_id)
        : null;
    }

    diagram.markModified('nodes');
    await diagram.save();

    return this.getActivityDiagramByID(diagramId);
  }

  public async deleteNode(diagramId: string, nodeId: string): Promise<void> {
    const diagram = await ActivityDiagramModel.findById(diagramId);
    if (!diagram) {
      throw new Error("Activity Diagram not found");
    }

    const normalizedNodeId = String(nodeId);
    const nodeIndex = diagram.nodes.findIndex(
      (node: any) => {
        const nodeIdStr = node._id ? String(node._id) : String(node.id || '');
        return nodeIdStr === normalizedNodeId;
      }
    );

    if (nodeIndex === -1) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const nodeObjectId = diagram.nodes[nodeIndex]._id;

    // Xóa tất cả edges liên quan đến node này
    for (let i = diagram.edges.length - 1; i >= 0; i--) {
      const edge = diagram.edges[i];
      const fromId = edge.from ? String(edge.from) : '';
      const toId = edge.to ? String(edge.to) : '';
      if (fromId === normalizedNodeId || toId === normalizedNodeId) {
        diagram.edges.splice(i, 1);
      }
    }
    diagram.markModified('edges');

    // Xóa node
    diagram.nodes.splice(nodeIndex, 1);
    diagram.markModified('nodes');
    await diagram.save();
  }

  // ==================== EDGE CRUD ====================
  public async createEdge(
    diagramId: string,
    data: {
      from: string;
      to: string;
      condition?: string;
      guard?: string;
      trigger?: string;
    }
  ): Promise<any> {
    const diagram = await ActivityDiagramModel.findById(diagramId);
    if (!diagram) {
      throw new Error("Activity Diagram not found");
    }

    const { Types } = await import("mongoose");
    const fromNodeId = new Types.ObjectId(data.from);
    const toNodeId = new Types.ObjectId(data.to);

    // Validate nodes exist
    const fromExists = diagram.nodes.some(
      (node: any) => String(node._id) === String(fromNodeId)
    );
    const toExists = diagram.nodes.some(
      (node: any) => String(node._id) === String(toNodeId)
    );

    if (!fromExists || !toExists) {
      throw new Error("Source or target node not found");
    }

    const newEdge: any = {
      from: fromNodeId,
      to: toNodeId,
    };

    if (data.condition !== undefined) {
      newEdge.condition = data.condition;
    }
    if (data.guard !== undefined) {
      newEdge.guard = data.guard;
    }
    if (data.trigger !== undefined) {
      newEdge.trigger = data.trigger;
    }

    diagram.edges.push(newEdge);
    diagram.markModified('edges');
    await diagram.save();

    return this.getActivityDiagramByID(diagramId);
  }

  public async updateEdge(
    diagramId: string,
    edgeId: string,
    data: {
      from?: string;
      to?: string;
      condition?: string;
      guard?: string;
      trigger?: string;
    }
  ): Promise<any> {
    const diagram = await ActivityDiagramModel.findById(diagramId);
    if (!diagram) {
      throw new Error("Activity Diagram not found");
    }

    const normalizedEdgeId = String(edgeId);
    const edgeIndex = diagram.edges.findIndex(
      (edge: any) => {
        const edgeIdStr = edge._id ? String(edge._id) : String(edge.id || '');
        return edgeIdStr === normalizedEdgeId;
      }
    );

    if (edgeIndex === -1) {
      throw new Error(`Edge not found: ${edgeId}`);
    }

    const { Types } = await import("mongoose");

    if (data.from !== undefined) {
      diagram.edges[edgeIndex].from = new Types.ObjectId(data.from);
    }
    if (data.to !== undefined) {
      diagram.edges[edgeIndex].to = new Types.ObjectId(data.to);
    }
    if (data.condition !== undefined) {
      diagram.edges[edgeIndex].condition = data.condition;
    }
    if (data.guard !== undefined) {
      diagram.edges[edgeIndex].guard = data.guard;
    }
    if (data.trigger !== undefined) {
      diagram.edges[edgeIndex].trigger = data.trigger;
    }

    diagram.markModified('edges');
    await diagram.save();

    return this.getActivityDiagramByID(diagramId);
  }

  public async deleteEdge(diagramId: string, edgeId: string): Promise<void> {
    const diagram = await ActivityDiagramModel.findById(diagramId);
    if (!diagram) {
      throw new Error("Activity Diagram not found");
    }

    const normalizedEdgeId = String(edgeId);
    const edgeIndex = diagram.edges.findIndex(
      (edge: any) => {
        const edgeIdStr = edge._id ? String(edge._id) : String(edge.id || '');
        return edgeIdStr === normalizedEdgeId;
      }
    );

    if (edgeIndex === -1) {
      throw new Error(`Edge not found: ${edgeId}`);
    }

    diagram.edges.splice(edgeIndex, 1);
    diagram.markModified('edges');
    await diagram.save();
  }

  // ==================== LANE CRUD ====================
  public async updateLane(
    diagramId: string,
    laneId: string,
    data: { name?: string }
  ): Promise<any> {
    const diagram = await ActivityDiagramModel.findById(diagramId);
    if (!diagram) {
      throw new Error("Activity Diagram not found");
    }

    const normalizedLaneId = String(laneId);
    const laneIndex = diagram.lanes.findIndex(
      (lane: any) => {
        const laneIdStr = lane._id ? String(lane._id) : String(lane.id || '');
        return laneIdStr === normalizedLaneId;
      }
    );

    if (laneIndex === -1) {
      throw new Error(`Lane not found: ${laneId}`);
    }

    if (data.name !== undefined) {
      diagram.lanes[laneIndex].name = data.name;
    }

    diagram.markModified('lanes');
    await diagram.save();

    return this.getActivityDiagramByID(diagramId);
  }

  public async deleteLane(diagramId: string, laneId: string): Promise<void> {
    const diagram = await ActivityDiagramModel.findById(diagramId);
    if (!diagram) {
      throw new Error("Activity Diagram not found");
    }

    const normalizedLaneId = String(laneId);
    const laneIndex = diagram.lanes.findIndex(
      (lane: any) => {
        const laneIdStr = lane._id ? String(lane._id) : String(lane.id || '');
        return laneIdStr === normalizedLaneId;
      }
    );

    if (laneIndex === -1) {
      throw new Error(`Lane not found: ${laneId}`);
    }

    // Set lane_id = null cho tất cả nodes thuộc lane này
    const { Types } = await import("mongoose");
    const lane = diagram.lanes[laneIndex] as any;
    const laneObjectId = lane?._id;
    if (laneObjectId) {
      diagram.nodes.forEach((node: any) => {
        if (node.lane_id && String(node.lane_id) === normalizedLaneId) {
          node.lane_id = null;
        }
      });
      diagram.markModified('nodes');
    }

    // Xóa lane
    diagram.lanes.splice(laneIndex, 1);
    diagram.markModified('lanes');
    await diagram.save();
  }
}


