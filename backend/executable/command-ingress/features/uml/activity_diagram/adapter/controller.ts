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
      const { language} = req.query as { [k: string]: string };
      if (!versionId || !requirementId) {
        res.status(400).json({ message: 'versionId và requirementId là bắt buộc.' });
        return;
      }
      const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
      const result = await this.service.generateFromUsecase(requirementId, lang, versionId,userId);
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
      const { versionId,actor } = req.params as { [k: string]: string };
      const { language } = req.query as { [k: string]: string };
      if (!versionId || !actor) {
        res.status(400).json({ message: 'versionId và actor là bắt buộc.' });
        return;
      }
      const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
      const result = await this.service.generateFromActor(versionId, actor, lang,userId);
      res.status(201).json({ message: 'Tạo activity diagram từ actor thành công!', data: result });
    } catch (err) {
      next(err);
    }
  }

  
  public getListActivityDiagram = async (req: HttpRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {versionId} = req.params;
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
}


