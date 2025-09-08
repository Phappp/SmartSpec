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
    avatar: string,
    phone: string
  ): Promise<ExchangeTokenResult>;
  login(email: string, password: string): Promise<ExchangeTokenResult>;

  forgotPassword(email: string): Promise<string>;

  resetPassword(token: string, newPassword: string): Promise<string>;

  toggleTwoFactorAuth(userId: string, enable: boolean): Promise<string>;
}

export { AuthService, ExchangeTokenRequest, ExchangeTokenResult };
