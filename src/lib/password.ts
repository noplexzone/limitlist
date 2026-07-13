import { scrypt, timingSafeEqual, randomBytes } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `scrypt:${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hashHex] = parts
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  const storedHash = Buffer.from(hashHex, 'hex')
  if (hash.length !== storedHash.length) return false
  return timingSafeEqual(hash, storedHash)
}
