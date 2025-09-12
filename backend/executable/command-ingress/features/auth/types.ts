type ExchangeTokenResult = {
  sub: string;
  refreshToken: string;
  accessToken: string;
};

type ExchangeTokenRequest = {
  code: string;
  idp: string;
};



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
  login(email: string, password: string): Promise<String>;

  forgotPassword(email: string): Promise<string>;

  resetPassword(token: string, newPassword: string): Promise<string>;

  toggleTwoFactorAuth(userId: string, enable: boolean): Promise<string>;

  verifyEmail(email: string): Promise<string>;
  verifyOTP(email: string, otp: string): Promise<ExchangeTokenResult>;
}

export { AuthService, ExchangeTokenRequest, ExchangeTokenResult };
