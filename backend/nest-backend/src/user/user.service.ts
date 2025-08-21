import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {Role} from "../common/constants/roles.const";
import {User} from "./dto/user.dto";


@Injectable()
export class UserService{
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    async findOneByUsername(username: string): Promise<User | undefined> {
        const user = await this.userRepository.findOne({
            where: { username }
        });
        return user ?? undefined;
    }
    async create(newUser: { password: string; username: string }):Promise<User> {

        const existingUser = await this.userRepository.findOne({
            where: { username: newUser.username }
        });
        if (existingUser) {
            throw new Error('Username already exists');
        }

        const user = this.userRepository.create({
            username: newUser.username,
            password: newUser.password,
            role: Role.USER
        });

        return await this.userRepository.save(user);
    }


}
