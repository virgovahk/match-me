export type AboutMeDTO = {
  id: number
  email: string
  firstName: string
  lastName: string
  birthDate: Date
  location: string
  hobbies: string[]
  profilePictureUrl: string | null
  createdAt: Date
  updatedAt: Date
}
