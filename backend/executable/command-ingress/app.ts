/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import env from './utils/env';
import logger from './middlewares/logger';
import morgan from 'morgan';
import fileUpload from 'express-fileupload';

import cors from 'cors';
import { recoverMiddleware } from './middlewares/recover';
import { createServer } from 'http';

import { createMockLoginRoute } from './utils/mock-login';
// import initAuthRoute from './features/auth/adapter/route';
// import { AuthController } from './features/auth/adapter/controller';
// import { AuthServiceImpl } from './features/auth/domain/service';
// import { GoogleIdentityBroker } from './features/auth/identity-broker/google-idp.broker';

import initOcrRoute from './features/handle_image/adapter/route';
import { OcrController } from './features/handle_image/adapter/controller';
import { OcrService } from './features/handle_image/domain/service';

import initReadDocxRoute from './features/handle_docx/adapter/route';
import { ReadDocxController } from './features/handle_docx/adapter/controller';
import { ReadDocxService } from './features/handle_docx/domain/service';

import initPdfRoute from './features/handle_pdf/adapter/route';
import { PdfController } from './features/handle_pdf/adapter/controller';
import { PdfService } from './features/handle_pdf/domain/service';

import initExtractorRoute from './features/handle_extraction/adapter/route';
import { ExtractorController } from './features/handle_extraction/adapter/controller';
import { ExtractorService } from './features/handle_extraction/domain/ExtractorService';

import initSpeechRoute from './features/handle_audio/adapter/route';
import { SpeechController } from './features/handle_audio/adapter/controller';
import { SpeechToTextService } from './features/handle_audio/domain/service';

import initTextRoute from './features/handle_text/adapter/route';
import { TextController } from './features/handle_text/adapter/controller';
import { TextService } from './features/handle_text/domain/service';

import initOrchestratorRoute from './features/orchestrator/adapter/route';
import { OrchestratorController } from './features/orchestrator/adapter/controller';
import { OrchestratorService } from './features/orchestrator/domain/service';


const app = express();

const createHttpServer = (redisClient: any) => {
  const server = createServer(app);

  const isProd = !env.DEV;
  if (isProd) {
    app.use(logger);
  }
  app.use(cors());
  app.use(morgan('combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(fileUpload());



  // Construct services
  // const googleIdentityBroker = new GoogleIdentityBroker({
  //   clientID: env.GOOGLE_OAUTH_CLIENT_ID,
  //   clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
  //   redirectURL: env.GOOGLE_OAUTH_REDIRECT_URL,
  // });

  // const authService = new AuthServiceImpl(
  //   googleIdentityBroker,
  //   env.JWT_SECRET,
  //   env.JWT_REFRESH_SECRET,
  // );

  // Setup route
  // app.use('/auth', initAuthRoute(new AuthController(authService))); //Xử lý xác thực người dùng
  app.use('/api/auth', createMockLoginRoute());
  app.use('/api/handle_docx', initReadDocxRoute(new ReadDocxController(new ReadDocxService())));
  app.use('/api/handle_pdf', initPdfRoute(new PdfController(new PdfService())));
  app.use('/api/handle_extraction', initExtractorRoute(new ExtractorController(new ExtractorService())));
  app.use('/api/handle_audio', initSpeechRoute(new SpeechController(new SpeechToTextService())));
  app.use('/api/handle_image', initOcrRoute(new OcrController(new OcrService())));
  app.use('/api/handle_text', initTextRoute(new TextController(new TextService())));
  app.use('/api/orchestrate', initOrchestratorRoute(new OrchestratorController(new OrchestratorService())));



  app.use(recoverMiddleware);


  return server;
};

export {
  createHttpServer,
};
