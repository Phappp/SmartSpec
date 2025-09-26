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
    request: ExchangeTokenRequest
  ): Promise<ExchangeTokenResult>;

  logout(token: string): Promise<string>;

  refreshToken(token: string): Promise<ExchangeTokenResult>;

  register(
    email: string,
    password: string,
    confirmPassword: string,
    name: string,
    isTwoFactorEnabled: boolean,
    dob: Date,
    gender: string
  ): Promise<ExchangeTokenResult>;
  login(email: string, password: string): Promise<LoginResponse>;

  forgotPassword(email: string): Promise<string>;

  resetPassword(token: string, newPassword: string): Promise<string>;

  toggleTwoFactorAuth(userId: string, enable: boolean): Promise<string>;

  sendVerificationEmail(email: string): Promise<boolean>;
  verifyOTP(email: string, otp: string, otpToken: string): Promise<ExchangeTokenResult>;
  verifyEmail(token: string): Promise<boolean>;
  getProfile(userId: string): Promise<any>;
}

export { AuthService, ExchangeTokenRequest, ExchangeTokenResult, LoginResponse };
