/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path";
import express from "express";
import env from "./utils/env";
import logger from "./middlewares/logger";
import morgan from "morgan";
import fileUpload from "express-fileupload";

import cors from "cors";
import { recoverMiddleware } from "./middlewares/recover";
import { createServer } from "http";

import initAuthRoute from "./features/auth/adapter/route";
import { AuthController } from "./features/auth/adapter/controller";
import { AuthServiceImpl } from "./features/auth/domain/service";
import { GoogleIdentityBroker } from "./features/auth/identity-broker/google-idp.broker";

import initUserRoute from "./features/user/adapter/route";
import { UserController } from "./features/user/adapter/controller";
import { UserServiceImpl } from "./features/user/domain/service";

import initApiKeyRoute from "./features/api_key/adapter/route";
import { ApiKeyController } from "./features/api_key/adapter/controller";
import { ApiKeyServiceImpl } from "./features/api_key/domain/service";

import initOcrRoute from "./features/handle_image/adapter/route";
import { OcrController } from "./features/handle_image/adapter/controller";
import { OcrService } from "./features/handle_image/domain/service";

import initReadDocxRoute from "./features/handle_docx/adapter/route";
import { ReadDocxController } from "./features/handle_docx/adapter/controller";
import { ReadDocxService } from "./features/handle_docx/domain/service";

import initPdfRoute from "./features/handle_pdf/adapter/route";
import { PdfController } from "./features/handle_pdf/adapter/controller";
import { PdfService } from "./features/handle_pdf/domain/service";

import initExtractorRoute from "./features/handle_extraction/adapter/route";
import { ExtractorController } from "./features/handle_extraction/adapter/controller";
import { ExtractorService } from "./features/handle_extraction/domain/ExtractorService";

import initSpeechRoute from "./features/handle_audio/adapter/route";
import { SpeechController } from "./features/handle_audio/adapter/controller";
import { SpeechToTextService } from "./features/handle_audio/domain/service";

import initNotificationRoute from "./features/notification/adapter/route";
import { NotificationController } from "./features/notification/adapter/controller";
import { NotificationServiceImpl } from "./features/notification/domain/service";

import initTextRoute from "./features/handle_text/adapter/route";
import { TextController } from "./features/handle_text/adapter/controller";
import { TextService } from "./features/handle_text/domain/service";

import initOrchestratorRoute from "./features/orchestrator/adapter/route";
import { OrchestratorController } from "./features/orchestrator/adapter/controller";
import { OrchestratorService } from "./features/orchestrator/domain/service";

import { ProjectService } from "./features/project/domain/service";
import { ProjectController } from "./features/project/adapter/controller";
import initProjectRoute from "./features/project/adapter/route";

import { InputHandleService } from "./features/input/domain/service";
import { InputHandleController } from "./features/input/adapter/controller";
import initInputHandleRoute from "./features/input/adapter/route";

import { ShareProjectService } from "./features/share/domain/service";
import { ShareProjectController } from "./features/share/adapter/controller";
import initShareProjectRoute from "./features/share/adapter/route";
import { notificationService } from "./services/notification.service";

import { UsecaseService } from "./features/usecase/domain/service";
import { UsecaseController } from "./features/usecase/adapter/controller";
import initUsecaseRoute from "./features/usecase/adapter/route";

import initLogRoute from "../command-ingress/features/log/adapter/route";
import { LogService } from "../command-ingress/features/log/domain/service";
import { LogController } from "../command-ingress/features/log/adapter/controller";

import initDatabaseRoute from "./features/database/adapter/route";
import { InputService } from "./features/orchestrator/domain/InputService";


import { UsecaseDiagramController } from "./features/uml/usecase.diagram/adapter/controller";
import { UsecaseDiagramServiceImpl } from "./features/uml/usecase.diagram/domain/service";
import initUsecaseDiagramRoute from "./features/uml/usecase.diagram/adapter/route";

import { SequenceDiagramController } from "./features/uml/sequence.diagram/adapter/controller";
import { SequenceDiagramServiceImpl } from "./features/uml/sequence.diagram/domain/service";
import initSequenceDiagramRoute from "./features/uml/sequence.diagram/adapter/route";


const app = express();

const createHttpServer = (redisClient: any) => {
  const server = createServer(app);

  const isProd = !env.DEV;
  if (isProd) {
    app.use(logger);
  }
  // app.use(cors());

  app.use(morgan(() => null));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(fileUpload());
  const uploadsDir = path.resolve(env.UPLOADS_PATH);
  app.use("/uploads", express.static(uploadsDir));
  app.use(
    cors({
      origin: "http://localhost:5173", // FE URL
      credentials: true,
    })
  );
  console.log("🔍 Debug static file paths:");
  console.log("Process CWD:", process.cwd());
  console.log("__dirname:", __dirname);

  // --- 2. CẤU HÌNH CORS ĐÚNG CHUẨN ---
  // const corsOptions = {
  //   // Thay bằng URL của frontend bạn, đọc từ file .env
  //   origin: 'http://localhost:5173',
  //   methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  //   // QUAN TRỌNG: Cho phép trình duyệt gửi header "Authorization"
  //   allowedHeaders: "Content-Type,Authorization"
  // };
  // app.use(cors(corsOptions));
  // app.options('*', cors(corsOptions)); // Xử lý các preflight request

  // Construct services
  const googleIdentityBroker = new GoogleIdentityBroker({
    clientID: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectURL: env.GOOGLE_OAUTH_REDIRECT_URL,
  });

  // ✨ THÊM ĐOẠN CODE KIỂM TRA NÀY VÀO
  console.log("--- Đang kiểm tra biến môi trường ---");
  console.log("JWT_SECRET:", process.env.JWT_SECRET ? "OK" : "!!! THIẾU !!!");
  console.log(
    "JWT_REFRESH_SECRET:",
    process.env.JWT_REFRESH_SECRET ? "OK" : "!!! THIẾU !!!"
  );
  console.log(
    "JWT_OTP_SECRET:",
    process.env.JWT_OTP_SECRET ? "OK" : "!!! THIẾU !!!"
  );
  console.log(
    "JWT_EMAIL_SECRET:",
    process.env.JWT_EMAIL_SECRET ? "OK" : "!!! THIẾU !!!"
  );
  console.log("-----------------------------------");
  const authService = new AuthServiceImpl(
    googleIdentityBroker,
    env.JWT_SECRET,
    env.JWT_REFRESH_SECRET,
    env.JWT_OTP_SECRET, // <-- Lấy giá trị mới từ .env
    env.JWT_EMAIL_SECRET // <-- Lấy giá trị mới từ .env
  );

  const orchestratorService = new OrchestratorService();
  const inputService = new InputService();

  const projectService = new ProjectService(orchestratorService, inputService);
  const projectController = new ProjectController(projectService);

  const inputHandleService = new InputHandleService(
    orchestratorService,
    inputService
  );
  const inputHandleController = new InputHandleController(inputHandleService);

  const usecaseService = new UsecaseService();
  const usecaseController = new UsecaseController(usecaseService);

  // Setup route

  app.use("/api/auth", initAuthRoute(new AuthController(authService)));
  app.use(
    "/api/orchestrate",
    initOrchestratorRoute(new OrchestratorController(new OrchestratorService()))
  );
  app.use("/api/projects", initProjectRoute(projectController));
  app.use("/api/input", initInputHandleRoute(inputHandleController));
  app.use("/api/usecaseManagement", initUsecaseRoute(usecaseController));
  app.use("/api/databases", initDatabaseRoute());
  app.use(
    "/api/keys",
    initApiKeyRoute(new ApiKeyController(new ApiKeyServiceImpl()))
  );
  app.use(
    "/api/users",
    initUserRoute(new UserController(new UserServiceImpl()))
  );

  app.use(
    "/api/usecase-diagram",
    initUsecaseDiagramRoute(
      new UsecaseDiagramController(new UsecaseDiagramServiceImpl())
    )
  );

  app.use(
    "/api/sequence-diagram",
    initSequenceDiagramRoute(
      new SequenceDiagramController(new SequenceDiagramServiceImpl())
    )
  );

  app.use(
    "/api/handle_docx",
    initReadDocxRoute(new ReadDocxController(new ReadDocxService()))
  );
  app.use("/api/handle_pdf", initPdfRoute(new PdfController(new PdfService())));
  app.use(
    "/api/handle_extraction",
    initExtractorRoute(new ExtractorController(new ExtractorService()))
  );
  app.use(
    "/api/handle_audio",
    initSpeechRoute(new SpeechController(new SpeechToTextService()))
  );
  app.use(
    "/api/handle_image",
    initOcrRoute(new OcrController(new OcrService()))
  );
  app.use(
    "/api/handle_text",
    initTextRoute(new TextController(new TextService()))
  );
  app.use(
    "/api/orchestrate",
    initOrchestratorRoute(new OrchestratorController(new OrchestratorService()))
  );
  app.use("/api/projects", initProjectRoute(projectController));
  app.use(
    "/api/projects",
    initShareProjectRoute(new ShareProjectController(new ShareProjectService()))
  );
  app.use(
    "/api/users",
    initShareProjectRoute(new ShareProjectController(new ShareProjectService()))
  );
  app.use(
    "/api/notifications",
    initNotificationRoute(
      new NotificationController(new NotificationServiceImpl())
    )
  );
  app.use("/api/logs", initLogRoute(new LogController(new LogService())));

  app.use(recoverMiddleware);

  return server;
};

export { createHttpServer };
