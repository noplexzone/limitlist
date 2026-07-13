import { prisma } from './db'

export async function isSetupComplete(): Promise<boolean> {
  const count = await prisma.appUser.count()
  return count > 0
}
