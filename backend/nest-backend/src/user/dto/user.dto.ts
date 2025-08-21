import { IsString } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    @IsString()
    username: string;

    @Column()
    @IsString()
    password: string;

    @Column({ default: 'user' })
    @IsString()
    role: string;
}
