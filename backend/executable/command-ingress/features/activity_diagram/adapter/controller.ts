import { Request, Response, NextFunction } from 'express';
import { ActivityDiagramService } from '../domain/service';

export class ActivityDiagramController {
  private service: ActivityDiagramService;

  constructor() {
    this.service = new ActivityDiagramService();
  }

  public generateFromUsecase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { versionId, requirementId } = req.params as { [k: string]: string };
      const { language} = req.query as { [k: string]: string };
      if (!versionId || !requirementId) {
        res.status(400).json({ message: 'versionId và requirementId là bắt buộc.' });
        return;
      }
      const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
      const result = await this.service.generateFromUsecase(requirementId, lang, versionId);
      res.status(201).json({ message: 'Tạo activity diagram từ usecase thành công!', data: result });
    } catch (err) {
      next(err);
    }
  }

  public generateFromActor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { versionId } = req.params as { [k: string]: string };
      const { actor, language } = req.query as { [k: string]: string };
      if (!versionId || !actor) {
        res.status(400).json({ message: 'versionId và actor là bắt buộc.' });
        return;
      }
      const lang = language === 'en-US' ? 'en-US' : 'vi-VN';
      const result = await this.service.generateFromActor(versionId, actor, lang);
      res.status(201).json({ message: 'Tạo activity diagram từ actor thành công!', data: result });
    } catch (err) {
      next(err);
    }
  }

  
  public getListActivityDiagram = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
  
  // // Diagram-level CRUD
  // public addNode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const { id } = req.params;
  //     const node = req.body;
  //     const data = await this.service.addNode(id, node);
  //     res.status(200).json({ data });
  //   } catch (err) { next(err); }
  // }

  // public updateNode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const { id, nodeId } = req.params;
  //     const node = req.body;
  //     const data = await this.service.updateNode(id, nodeId, node);
  //     res.status(200).json({ data });
  //   } catch (err) { next(err); }
  // }

  // public removeNode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const { id, nodeId } = req.params;
  //     const data = await this.service.removeNode(id, nodeId);
  //     res.status(200).json({ data });
  //   } catch (err) { next(err); }
  // }

  // public addEdge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const { id } = req.params;
  //     const edge = req.body;
  //     const data = await this.service.addEdge(id, edge);
  //     res.status(200).json({ data });
  //   } catch (err) { next(err); }
  // }

  // public updateEdge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const { id, index } = req.params as any;
  //     const edge = req.body;
  //     const data = await this.service.updateEdge(id, Number(index), edge);
  //     res.status(200).json({ data });
  //   } catch (err) { next(err); }
  // }

  // public removeEdge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const { id, index } = req.params as any;
  //     const data = await this.service.removeEdge(id, Number(index));
  //     res.status(200).json({ data });
  //   } catch (err) { next(err); }
  // }

  // public updateSvg = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const { id } = req.params;
  //     const { diagram_svg } = req.body;
  //     const data = await this.service.updateSvg(id, diagram_svg);
  //     res.status(200).json({ data });
  //   } catch (err) { next(err); }
  // }

  // public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const payload = req.body;
  //     const diagram = await this.service.create(payload);
  //     res.status(201).json({ message: 'Tạo mới activity diagram thành công!', data: diagram });
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  // public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const { id } = req.params;
  //     const payload = req.body;
  //     const updated = await this.service.update(id, payload);
  //     if (!updated) {
  //       res.status(404).json({ message: 'Không tìm thấy activity diagram để cập nhật.' });
  //       return;
  //     }
  //     res.status(200).json({ message: 'Cập nhật activity diagram thành công!', data: updated });
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  // public remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  //   try {
  //     const { id } = req.params;
  //     const ok = await this.service.remove(id);
  //     if (!ok) {
  //       res.status(404).json({ message: 'Không tìm thấy activity diagram để xoá.' });
  //       return;
  //     }
  //     res.status(200).json({ message: 'Xoá activity diagram thành công!' });
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  public validateStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.validateStructure(id);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  public exportSvg = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const svg = await this.service.exportSvg(id);
      if (!svg) {
        res.status(404).json({ message: 'Không có SVG cho activity diagram.' });
        return;
      }
      res.status(200).type('image/svg+xml').send(svg);
    } catch (err) {
      next(err);
    }
  }
}


