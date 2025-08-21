import {ApiProperty} from "@nestjs/swagger";
import {IsNumber, IsString} from "class-validator";
import {Column, Entity, JoinColumn, ManyToOne,OneToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn} from "typeorm";
import {User} from "../../user/dto/user.dto";

@Entity('policies')
export class Policy{

    @ApiProperty()
    @IsNumber()
    @PrimaryGeneratedColumn()
    id:number;

    @ApiProperty()
    @Column()
    @IsString()
    policyName:string;

    @OneToOne(() => User, user => user.id)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ApiProperty()
    @Column()
    userId: number;

    @ApiProperty()
    @Column()
    @IsString()
    status: string;

    @ApiProperty()
    @Column('decimal', { precision: 10, scale: 2 })
    @IsNumber()
    outstanding: number;

    @ApiProperty()
    @Column()
    @IsNumber()
    policyTerm: number;

    @ApiProperty()
    @Column({ type: 'timestamp' })
    paymentDueDate: Date;

    @ApiProperty()
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty()
    @UpdateDateColumn()
    updatedAt: Date;
}