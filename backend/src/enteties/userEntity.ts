import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { ConnectionEntity } from './connectionEntity'
import { MessageEntity } from './messageEntity'


@Entity()
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ unique: true })
  email!: string

  @Column()
  passwordHash!: string

  @Column()
  firstName!: string

  @Column()
  lastName!: string

  @Column()
  birthDate!: Date

  @Column()
  location!: string

  @Column("simple-array")
  hobbies!: string[]
  
  @Column("simple-array")
  language!: string[]

  @Column({ nullable: true })
  profilePictureUrl!: string | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @OneToMany(() => ConnectionEntity, connection => connection.sender)
  sentConnections!: ConnectionEntity[]

  @OneToMany(() => ConnectionEntity, connection => connection.receiver)
  receivedConnections!: ConnectionEntity[]

  @OneToMany(() => MessageEntity, (message) => message.sender)
  messages!: MessageEntity[]
}
