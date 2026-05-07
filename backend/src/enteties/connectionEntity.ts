import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
import { UserEntity } from "./userEntity"
import { ChatEntity } from "./chatEntity"


@Entity()
export class ConnectionEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => UserEntity, (user) => user.sentConnections)
  sender!: UserEntity

  @ManyToOne(() => UserEntity, (user) => user.receivedConnections)
  receiver!: UserEntity

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  })
  status!: 'pending' | 'accepted' | 'rejected'

  @OneToOne(() => ChatEntity, {nullable: true})
  @JoinColumn()
  chat!: ChatEntity | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
