import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm'
import { ChatEntity } from './chatEntity'
import { UserEntity } from './userEntity'

@Entity()
export class MessageEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => ChatEntity, (chat) => chat.messages)
  chat!: ChatEntity

  @ManyToOne(() => UserEntity)
  sender!: UserEntity

  @Column()
  message!: string

  @Column({ nullable: true})
  readAt!: Date | null

  @CreateDateColumn()
  createdAt!: Date
  
  @UpdateDateColumn()
  updatedAt!: Date
}
