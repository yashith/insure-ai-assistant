import { IsString } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/dto/user.dto';
import {ApiProperty} from "@nestjs/swagger";

@Entity('claims')
export class Claim{
    @PrimaryGeneratedColumn()
    @ApiProperty()
    id: number;

    @Column()
    @ApiProperty()
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    @ApiProperty()
    user: User;

    @Column()
    @IsString()
    @ApiProperty()
    status : string;

    @Column()
    @IsString()
    @ApiProperty()
    vehicle: string;

    @Column()
    @IsString()
    @ApiProperty()
    damage: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @ApiProperty()
    createdAt: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    @ApiProperty()
    updatedAt: Date;
}
