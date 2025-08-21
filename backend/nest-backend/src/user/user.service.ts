import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {Role} from "../common/constants/roles.const";
import {User} from "./dto/user.dto";


@Injectable()
export class UserService{
    constructor(
        private dataSource: DataSource
    ) {}

    async findOneByUsername(username: string): Promise<User | undefined> {
        const userRepository = this.dataSource.getRepository(User);
        const user = await userRepository.findOne({
            where: { username }
        });
        return user ?? undefined;
    }
    async create(newUser: { password: string; username: string }):Promise<User> {
        const userRepository = this.dataSource.getRepository(User);
        
        const existingUser = await userRepository.findOne({
            where: { username: newUser.username }
        });
        if (existingUser) {
            throw new Error('Username already exists');
        }

        const user = userRepository.create({
            username: newUser.username,
            password: newUser.password,
            role: Role.USER
        });

        return await userRepository.save(user);
    }


}
