import { v4 as uuidv4 } from "uuid";
import { ApiKeyService } from "../types";
import User from "../../../../../internal/model/user";
import Session from "../../../../../internal/model/session";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { generateJwt, generateJwtOTP } from "../../../services/jwtService";
import mailService from "../../../services/sendMail.service";


export class ApiKeyServiceImpl implements ApiKeyService {
  
}
