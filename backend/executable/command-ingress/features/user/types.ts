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
  getme(token: string): Promise<any>;
  updateProfile(userId: string, body: any): Promise<UserResponse>;
  changePassword(userId: string, body: any): Promise<string>;
  resetPasswordById(id: string): Promise<string>;
  deleteUserById(id: string): Promise<string>;
  searchUsersByNameOrEmail(content: string): Promise<UserResponse[]>;
  filterUsers(system_role?: string, status?: string, gender?: string): Promise<UserResponse[]>;
}

export { UserService, ExchangeTokenRequest, ExchangeTokenResult, UserResponse };
