import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { User } from '../user/dto/user.dto';
import { LoginRequestDto } from './dto/login.req.dto';
import { RegisterRequestDto } from './dto/register.req.dto';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
    role: 'user',
  };

  const mockUserService = {
    findOneByUsername: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should validate and return user when all parameters match', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(mockUser);

      const result = await authService.validateUser(1, 'testuser', 'user');

      expect(result).toEqual(mockUser);
      expect(mockUserService.findOneByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(undefined);

      await expect(
        authService.validateUser(1, 'nonexistent', 'user')
      ).rejects.toThrow(new BadRequestException('User not found'));
    });

    it('should throw BadRequestException when user ID does not match', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(mockUser);

      await expect(
        authService.validateUser(999, 'testuser', 'user')
      ).rejects.toThrow(new BadRequestException('Invalid token'));
    });

    it('should throw BadRequestException when username does not match', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(mockUser);

      await expect(
        authService.validateUser(1, 'wronguser', 'user')
      ).rejects.toThrow(new BadRequestException('Invalid token'));
    });

    it('should throw BadRequestException when role does not match', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(mockUser);

      await expect(
        authService.validateUser(1, 'testuser', 'admin')
      ).rejects.toThrow(new BadRequestException('Invalid token'));
    });
  });

  describe('login', () => {
    const loginDto: LoginRequestDto = {
      username: 'testuser',
      password: 'password123',
    };

    it('should successfully login with correct credentials', async () => {
      const expectedToken = 'mock-jwt-token';
      
      mockUserService.findOneByUsername.mockResolvedValue(mockUser);
      mockBcrypt.compareSync.mockReturnValue(true);
      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = await authService.login(loginDto);

      expect(result).toEqual({ access_token: expectedToken });
      expect(mockUserService.findOneByUsername).toHaveBeenCalledWith('testuser');
      expect(mockBcrypt.compareSync).toHaveBeenCalledWith(
        'testuser' + 'password123',
        'hashedpassword'
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        userId: 1,
        username: 'testuser',
        role: 'user',
        sessionId: 'mock-uuid-123',
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(undefined);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new BadRequestException('User not found')
      );
    });

    it('should throw BadRequestException when password does not match', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(mockUser);
      mockBcrypt.compareSync.mockReturnValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new BadRequestException('Password does not match')
      );
    });

    it('should call bcrypt.compareSync with concatenated username and password', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(mockUser);
      mockBcrypt.compareSync.mockReturnValue(true);
      mockJwtService.sign.mockReturnValue('token');

      await authService.login(loginDto);

      expect(mockBcrypt.compareSync).toHaveBeenCalledWith(
        'testuser' + 'password123',
        'hashedpassword'
      );
    });
  });

  describe('register', () => {
    const registerDto: RegisterRequestDto = {
      username: 'newuser',
      password: 'newpassword123',
    };

    it('should successfully register a new user', async () => {
      const hashedPassword = 'hashed-new-password';
      
      mockUserService.findOneByUsername.mockResolvedValue(undefined);
      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockUserService.create.mockResolvedValue(undefined);

      const result = await authService.register(registerDto);

      expect(result).toEqual({
        message: 'User registered successfully',
      });
      expect(mockUserService.findOneByUsername).toHaveBeenCalledWith('newuser');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newuser' + 'newpassword123', 10);
      expect(mockUserService.create).toHaveBeenCalledWith({
        username: 'newuser',
        password: hashedPassword,
      });
    });

    it('should throw BadRequestException when username already exists', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(
        new BadRequestException('Username already exists')
      );
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it('should hash password with concatenated username and password', async () => {
      mockUserService.findOneByUsername.mockResolvedValue(undefined);
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockUserService.create.mockResolvedValue(undefined);

      await authService.register(registerDto);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(
        'newuser' + 'newpassword123',
        10
      );
    });
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(authService).toBeDefined();
    });

    it('should have userService dependency', () => {
      expect(userService).toBeDefined();
    });

    it('should have jwtService dependency', () => {
      expect(jwtService).toBeDefined();
    });
  });
});
