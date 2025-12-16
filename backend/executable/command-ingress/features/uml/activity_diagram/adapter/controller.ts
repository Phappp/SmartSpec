import { Request, Response, NextFunction } from 'express';
import { ActivityDiagramService } from '../domain/service';
import { handleServiceResponse } from "../../../../services/httpHandlerResponse";
import { ServiceResponse, ResponseStatus } from "../../../../services/serviceResponse";
import { HttpRequest } from '@/executable/command-ingress/types';

export class ActivityDiagramController {
  private service: ActivityDiagramService;

  constructor() {
    this.service = new ActivityDiagramService();
  }

  public generateFromUsecase = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }
      const { versionId, requirementId } = req.params as { [k: string]: string };
      const { language } = req.query as { [k: string]: string };
      if (!versionId || !requirementId) {
        res.status(400).json({ message: 'versionId và requirementId là bắt buộc.' });
        return;
      }
      const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
      const result = await this.service.generateFromUsecase(requirementId, lang, versionId, userId);
      res.status(201).json({ message: 'Tạo activity diagram từ usecase thành công!', data: result });
    } catch (err) {
      next(err);
    }
  }

  public generateFromActor = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }
      const { versionId, actor } = req.params as { [k: string]: string };
      const { language } = req.query as { [k: string]: string };
      if (!versionId || !actor) {
        res.status(400).json({ message: 'versionId và actor là bắt buộc.' });
        return;
      }
      const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
      const result = await this.service.generateFromActor(versionId, actor, lang, userId);
      res.status(201).json({ message: 'Tạo activity diagram từ actor thành công!', data: result });
    } catch (err) {
      next(err);
    }
  }


  public create = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }
      const { project_id, version_id, name, description } = req.body;
      if (!project_id || !version_id || !name) {
        res.status(400).json({ message: 'project_id, version_id, và name là bắt buộc.' });
        return;
      }
      const result = await this.service.create(project_id, version_id, name, description, userId);
      res.status(201).json({ message: 'Tạo activity diagram thành công!', data: result });
    } catch (err) {
      next(err);
    }
  }

  public getListActivityDiagram = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { versionId } = req.params;
      const result = await this.service.getListActivityDiagram(versionId);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  public getActivityDiagramByID = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId } = req.params;
      const diagram = await this.service.getActivityDiagramByID(activityDiagramId);
      if (!diagram) {
        res.status(404).json({ message: 'Không tìm thấy activity diagram.' });
        return;
      }
      res.status(200).json({ data: diagram });
    } catch (err) {
      next(err);
    }
  }

  public validateStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId } = req.params;
      const result = await this.service.validateStructure(activityDiagramId);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  public export = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId } = req.params;
      const pngBuffer = await this.service.export(activityDiagramId);

      if (!pngBuffer) {
        res.status(404).json({ message: 'Không thể tạo PNG cho activity diagram.' });
        return;
      }

      res.status(200)
        .type('image/png')
        .setHeader('Content-Disposition', `attachment; filename="activity-diagram-${activityDiagramId}.png"`)
        .send(pngBuffer);
    } catch (err) {
      next(err);
    }
  }

  public deleteActivityDiagram = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.getSubject();
      if (!userId) {
        handleServiceResponse(new ServiceResponse(ResponseStatus.Failed, "Unauthorized", null, 401), res);
        return;
      }

      const { activityDiagramId } = req.params;
      const { ids } = req.body;

      if (!activityDiagramId && !ids) {
        res.status(400).json({ message: 'No Activity Diagram found to delete' });
        return;
      }

      const idToDelete = activityDiagramId || ids;

      const result = await this.service.deleteActivityDiagram(idToDelete, userId);

      if (result.deletedCount === 0) {
        res.status(404).json({ message: 'No Activity Diagram found to delete' });
        return;
      }

      res.status(200).json({
        message: 'Activity diagram deleted Successfully',
        deletedCount: result.deletedCount
      });
    } catch (err: any) {
      // Xử lý lỗi cụ thể mà không in ra console
      if (err.message.includes('owner') || err.message.includes('editor')) {
        res.status(403).json({
          message: 'Only owner or editor can delete usecase diagrams'
        });
      } else if (err.message.includes('Unauthorized')) {
        res.status(403).json({
          message: 'Unauthorized - User is not a member of this project'
        });
      } else {
        // Chuyển lỗi khác đến error handler chung
        next(err);
      }
    }
  }

  public updateNodePosition = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId, nodeId } = req.params;
      const position = req.body;

      if (!activityDiagramId) {
        res.status(400).json({ message: "ActivityDiagramId is required." });
        return;
      }
      if (!nodeId) {
        res.status(400).json({ message: "NodeId is required." });
        return;
      }
      if (!position || position.x === undefined || position.y === undefined) {
        res.status(400).json({ message: "Valid position {x, y} is required." });
        return;
      }

      const responseData = await this.service.updateNodePosition(
        activityDiagramId,
        nodeId,
        position
      );

      res.status(200).json({
        status: "Success",
        message: "Update Node Position Successfully",
        data: responseData,
      });
    } catch (err) {
      next(err);
    }
  }

  public updateMultipleNodePositions = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId } = req.params;
      const { nodes } = req.body;

      if (!activityDiagramId) {
        res.status(400).json({ message: "ActivityDiagramId is required." });
        return;
      }
      if (!nodes || !Array.isArray(nodes)) {
        res.status(400).json({ message: "Valid nodes array is required." });
        return;
      }

      const responseData = await this.service.updateMultipleNodePositions(
        activityDiagramId,
        nodes
      );

      res.status(200).json({
        status: "Success",
        message: "Update Multiple Node Positions Successfully",
        data: responseData,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==================== NODE CRUD ====================
  public updateNode = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId, nodeId } = req.params;
      const data = req.body;

      if (!activityDiagramId) {
        res.status(400).json({ message: "Activity Diagram ID is required." });
        return;
      }
      if (!nodeId) {
        res.status(400).json({ message: "Node ID is required." });
        return;
      }
      if (!data) {
        res.status(400).json({ message: "Data is required." });
        return;
      }

      const responseData = await this.service.updateNode(
        activityDiagramId,
        nodeId,
        data
      );

      res.status(200).json({
        status: "Success",
        message: "Update Node Successfully",
        data: responseData,
      });
    } catch (err) {
      next(err);
    }
  }

  public deleteNode = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId, nodeId } = req.params;

      if (!activityDiagramId) {
        res.status(400).json({ message: "Activity Diagram ID is required." });
        return;
      }
      if (!nodeId) {
        res.status(400).json({ message: "Node ID is required." });
        return;
      }

      await this.service.deleteNode(activityDiagramId, nodeId);

      res.status(200).json({
        status: "Success",
        message: "Delete Node Successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  // ==================== EDGE CRUD ====================
  public createEdge = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId } = req.params;
      const data = req.body;

      if (!activityDiagramId) {
        res.status(400).json({ message: "Activity Diagram ID is required." });
        return;
      }
      if (!data || !data.from || !data.to) {
        res.status(400).json({
          message: "from and to are required."
        });
        return;
      }

      const responseData = await this.service.createEdge(
        activityDiagramId,
        data
      );

      res.status(200).json({
        status: "Success",
        message: "Create Edge Successfully",
        data: responseData,
      });
    } catch (err) {
      next(err);
    }
  }

  public updateEdge = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId, edgeId } = req.params;
      const data = req.body;

      if (!activityDiagramId) {
        res.status(400).json({ message: "Activity Diagram ID is required." });
        return;
      }
      if (!edgeId) {
        res.status(400).json({ message: "Edge ID is required." });
        return;
      }
      if (!data) {
        res.status(400).json({ message: "Data is required." });
        return;
      }

      const responseData = await this.service.updateEdge(
        activityDiagramId,
        edgeId,
        data
      );

      res.status(200).json({
        status: "Success",
        message: "Update Edge Successfully",
        data: responseData,
      });
    } catch (err) {
      next(err);
    }
  }

  public deleteEdge = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId, edgeId } = req.params;

      if (!activityDiagramId) {
        res.status(400).json({ message: "Activity Diagram ID is required." });
        return;
      }
      if (!edgeId) {
        res.status(400).json({ message: "Edge ID is required." });
        return;
      }

      await this.service.deleteEdge(activityDiagramId, edgeId);

      res.status(200).json({
        status: "Success",
        message: "Delete Edge Successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  // ==================== LANE CRUD ====================
  public updateLane = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId, laneId } = req.params;
      const data = req.body;

      if (!activityDiagramId) {
        res.status(400).json({ message: "Activity Diagram ID is required." });
        return;
      }
      if (!laneId) {
        res.status(400).json({ message: "Lane ID is required." });
        return;
      }
      if (!data) {
        res.status(400).json({ message: "Data is required." });
        return;
      }

      const responseData = await this.service.updateLane(
        activityDiagramId,
        laneId,
        data
      );

      res.status(200).json({
        status: "Success",
        message: "Update Lane Successfully",
        data: responseData,
      });
    } catch (err) {
      next(err);
    }
  }

  public deleteLane = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activityDiagramId, laneId } = req.params;

      if (!activityDiagramId) {
        res.status(400).json({ message: "Activity Diagram ID is required." });
        return;
      }
      if (!laneId) {
        res.status(400).json({ message: "Lane ID is required." });
        return;
      }

      await this.service.deleteLane(activityDiagramId, laneId);

      res.status(200).json({
        status: "Success",
        message: "Delete Lane Successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}


