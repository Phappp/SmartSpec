import { Router } from 'express';
import { StatsController } from './controller';
import { requireAuthorizedUser, requireRole } from '../../../middlewares/auth';

export default function initStatsRoute(controller: StatsController): Router {
  const router = Router();
  router.get('/usage-summary', requireAuthorizedUser, requireRole('ADMIN'), controller.usageSummary.bind(controller));
  router.get('/provider-usage', requireAuthorizedUser, requireRole('ADMIN'), controller.providerUsage.bind(controller));
  router.get('/quick', requireAuthorizedUser, requireRole('ADMIN'), controller.quickStats.bind(controller));
  router.get('/system', requireAuthorizedUser, requireRole('ADMIN'), controller.systemStats.bind(controller));
  router.get('/trends', requireAuthorizedUser, requireRole('ADMIN'), controller.trends.bind(controller));
  router.get('/activities', requireAuthorizedUser, requireRole('ADMIN'), controller.activities.bind(controller));
  router.get('/settings', requireAuthorizedUser, requireRole('ADMIN'), controller.getSettings.bind(controller));
  router.put('/settings', requireAuthorizedUser, requireRole('ADMIN'), controller.updateSettings.bind(controller));
  return router;
}
