type ExchangeTokenResult = {
  sub: string;
  refreshToken: string;
  accessToken: string;
};

type ExchangeTokenRequest = {
  code: string;
  idp: string;
};

interface UserResponse {
  id: string;
  email: string;
  avatarUrl: string;
  name: string;
  dob: Date;
  system_role: string;
  status: string;
  gender: string;
  isTwoFactorEnabled: boolean;
}

interface UserService {
  getAllUsers(): Promise<UserResponse[]>;
  getUserById(id: string): Promise<UserResponse>;
  updateUserById(
    id: string,
    body: {
      email: string;
      name: string;
      newDob: Date;
      gender: string;
      avatarUrl: string;
      status: string;
    }
  ): Promise<UserResponse>;
  getme(token: string): Promise<any>;
  updateProfile(userId: string, body: any): Promise<UserResponse>;
  changePassword(userId: string, body: any): Promise<string>;
}

export { UserService, ExchangeTokenRequest, ExchangeTokenResult, UserResponse };
