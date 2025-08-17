import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import * as console from "console";
import * as fs from "fs";

export type User = {
    id: number;
    username: string;
    password: string;
    role: string;
}
@Injectable()
export class UserService implements OnModuleInit,OnModuleDestroy{
    private users: User[] = [
        {id: 1, username: 'john', password: 'changeme', role: 'user'},
        {id: 2, username: 'maria', password: 'guess', role: 'user'},
        {id: 3, username: 'admin', password: 'admin', role: 'admin'},
    ]
    //TODO only for testing user storage
    //TODO replace loading users from file with database
    private readonly filePath = 'users.json';
    async findOne(username: string): Promise<User | undefined> {
        this.loadUsers()
        this.users.forEach((user => {
            console.log(user.username)}));
        return this.users.find(user => user.username === username);
    }

    async create(newUser: { password: string; username: string }):Promise<User> {
        const user:User={
            id: this.users.length + 1,
            username: newUser.username,
            password: newUser.password,
            role: 'user' //TODO default check role
        }
        this.users.push(user)
        this.saveUsers()
        return user;
    }


    async onModuleInit() {
        this.loadUsers();
    }

    async onModuleDestroy() {
        this.saveUsers();
    }

    private loadUsers() {
        if (fs.existsSync(this.filePath)) {
            const data = fs.readFileSync(this.filePath, 'utf-8');
            this.users = JSON.parse(data);
        }
    }

    private saveUsers() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.users, null, 2));
    }
}
