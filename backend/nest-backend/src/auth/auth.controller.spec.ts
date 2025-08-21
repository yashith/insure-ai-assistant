import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login.req.dto';
import { RegisterRequestDto } from './dto/register.req.dto';
import { AccessToken } from './dto/auth.token.dto';
import { GenericResponse } from './dto/generic.res.dto';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginRequestDto = {
      username: 'testuser',
      password: 'password123',
    };

    const mockAccessToken: AccessToken = {
      access_token: 'mock-jwt-token-12345',
    };

    it('should successfully login and return access token', async () => {
      mockAuthService.login.mockResolvedValue(mockAccessToken);

      const result = await authController.login(loginDto);

      expect(result).toEqual(mockAccessToken);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should handle login with empty username', async () => {
      const invalidLoginDto: LoginRequestDto = {
        username: '',
        password: 'password123',
      };

      const error = new BadRequestException('User not found');
      mockAuthService.login.mockRejectedValue(error);

      await expect(authController.login(invalidLoginDto)).rejects.toThrow(error);
      expect(mockAuthService.login).toHaveBeenCalledWith(invalidLoginDto);
    });

    it('should handle login with empty password', async () => {
      const invalidLoginDto: LoginRequestDto = {
        username: 'testuser',
        password: '',
      };

      const error = new BadRequestException('Password does not match');
      mockAuthService.login.mockRejectedValue(error);

      await expect(authController.login(invalidLoginDto)).rejects.toThrow(error);
      expect(mockAuthService.login).toHaveBeenCalledWith(invalidLoginDto);
    });

    it('should handle user not found scenario', async () => {
      const error = new BadRequestException('User not found');
      mockAuthService.login.mockRejectedValue(error);

      await expect(authController.login(loginDto)).rejects.toThrow(error);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should handle incorrect password scenario', async () => {
      const error = new BadRequestException('Password does not match');
      mockAuthService.login.mockRejectedValue(error);

      await expect(authController.login(loginDto)).rejects.toThrow(error);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockAuthService.login.mockRejectedValue(error);

      await expect(authController.login(loginDto)).rejects.toThrow(error);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should pass through the exact DTO to service', async () => {
      const customLoginDto: LoginRequestDto = {
        username: 'special-user',
        password: 'complex-password-123!@#',
      };

      mockAuthService.login.mockResolvedValue(mockAccessToken);

      await authController.login(customLoginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(customLoginDto);
    });
  });

  describe('register', () => {
    const registerDto: RegisterRequestDto = {
      username: 'newuser',
      password: 'newpassword123',
    };

    const mockGenericResponse: GenericResponse = {
      message: 'User registered successfully',
    };

    it('should successfully register a new user', async () => {
      mockAuthService.register.mockResolvedValue(mockGenericResponse);

      const result = await authController.register(registerDto);

      expect(result).toEqual(mockGenericResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should handle registration with empty username', async () => {
      const invalidRegisterDto: RegisterRequestDto = {
        username: '',
        password: 'password123',
      };

      const error = new BadRequestException('Username already exists');
      mockAuthService.register.mockRejectedValue(error);

      await expect(authController.register(invalidRegisterDto)).rejects.toThrow(error);
      expect(mockAuthService.register).toHaveBeenCalledWith(invalidRegisterDto);
    });

    it('should handle registration with empty password', async () => {
      const invalidRegisterDto: RegisterRequestDto = {
        username: 'newuser',
        password: '',
      };

      mockAuthService.register.mockResolvedValue(mockGenericResponse);

      const result = await authController.register(invalidRegisterDto);

      expect(result).toEqual(mockGenericResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(invalidRegisterDto);
    });

    it('should handle username already exists scenario', async () => {
      const error = new BadRequestException('Username already exists');
      mockAuthService.register.mockRejectedValue(error);

      await expect(authController.register(registerDto)).rejects.toThrow(error);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should handle service errors during registration', async () => {
      const error = new Error('Database connection failed');
      mockAuthService.register.mockRejectedValue(error);

      await expect(authController.register(registerDto)).rejects.toThrow(error);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should pass through the exact DTO to service', async () => {
      const customRegisterDto: RegisterRequestDto = {
        username: 'special-new-user',
        password: 'complex-new-password-456!@#',
      };

      mockAuthService.register.mockResolvedValue(mockGenericResponse);

      await authController.register(customRegisterDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(customRegisterDto);
    });

    it('should handle registration with special characters in username', async () => {
      const specialRegisterDto: RegisterRequestDto = {
        username: 'user@domain.com',
        password: 'password123',
      };

      mockAuthService.register.mockResolvedValue(mockGenericResponse);

      const result = await authController.register(specialRegisterDto);

      expect(result).toEqual(mockGenericResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(specialRegisterDto);
    });
  });

  describe('controller initialization', () => {
    it('should be defined', () => {
      expect(authController).toBeDefined();
    });

    it('should have authService dependency', () => {
      expect(authService).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should propagate BadRequestException from login', async () => {
      const loginDto: LoginRequestDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const badRequestError = new BadRequestException('Password does not match');
      mockAuthService.login.mockRejectedValue(badRequestError);

      await expect(authController.login(loginDto)).rejects.toThrow(badRequestError);
    });

    it('should propagate BadRequestException from register', async () => {
      const registerDto: RegisterRequestDto = {
        username: 'existinguser',
        password: 'password123',
      };

      const badRequestError = new BadRequestException('Username already exists');
      mockAuthService.register.mockRejectedValue(badRequestError);

      await expect(authController.register(registerDto)).rejects.toThrow(badRequestError);
    });
  });
});
