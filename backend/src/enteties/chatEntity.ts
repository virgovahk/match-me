import { Entity, PrimaryGeneratedColumn, OneToMany, UpdateDateColumn, CreateDateColumn, OneToOne } from 'typeorm'
import { ConnectionEntity } from './connectionEntity'
import { MessageEntity } from './messageEntity'
  
@Entity()
export class ChatEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @OneToOne(() => ConnectionEntity, (connection) => connection.chat)
  connection!: ConnectionEntity

  @OneToMany(() => MessageEntity, (message) => message.chat)
  messages!: MessageEntity[]

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
