type ExchangeTokenResult = {
  sub: string;
  refreshToken: string;
  accessToken: string;
};

type ExchangeTokenRequest = {
  code: string;
  idp: string;
};

interface LoginResponse {
  isTwoFactorEnabled: boolean;
  otpToken?: string;
  accessToken?: string;
  refreshToken?: string;
  sub?: string;
}

interface AuthService {
  exchangeWithGoogleIDP(
    request: ExchangeTokenRequest, ip?: string, userAgent?:string
  ): Promise<ExchangeTokenResult>;

  logout(token: string,ip?: string, userAgent?:string): Promise<string>;

  refreshToken(token: string): Promise<ExchangeTokenResult>;

  register(
    email: string,
    password: string,
    confirmPassword: string,
    name: string,
    isTwoFactorEnabled: boolean,
    dob: Date,
    gender: string,
    ip?: string, userAgent?:string
  ): Promise<ExchangeTokenResult>;
  // có sửa
  login(email: string, password: string,ip?: string, userAgent?:string): Promise<LoginResponse>;

  forgotPassword(email: string, ip?: string, userAgent?:string): Promise<string>;

  resetPassword(token: string, newPassword: string,ip?: string, userAgent?:string): Promise<string>;

  toggleTwoFactorAuth(userId: string, enable: boolean,ip?: string, userAgent?:string): Promise<string>;

  sendVerificationEmail(email: string): Promise<boolean>;
  verifyOTP(email: string, otp: string, otpToken: string,ip?: string, userAgent?:string): Promise<ExchangeTokenResult>;
  verifyEmail(token: string,ip?: string, userAgent?:string): Promise<boolean>;
  getProfile(userId: string): Promise<any>;
}

export { AuthService, ExchangeTokenRequest, ExchangeTokenResult, LoginResponse };
