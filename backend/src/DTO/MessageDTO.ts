export type MessageDTO = {
  id: number
  chatId: number
  senderId: number
  message: string
  createdAt: Date
  updatedAt: Date
  readAt: Date | null
}
