import { db } from '../index.js';
import { User, TelegramUser } from '../../types.js';

export async function findUserById(id: number): Promise<User | undefined> {
  await db.read();
  return db.data.users.find(user => user.id === id);
}

export async function createUser(telegramUser: TelegramUser): Promise<User> {
  await db.read();

  const existingUser = db.data.users.find(u => u.id === telegramUser.id);
  if (existingUser) {
    return existingUser;
  }

  const now = new Date().toISOString();
  const newUser: User = {
    id: telegramUser.id,
    firstName: telegramUser.first_name,
    lastName: telegramUser.last_name,
    username: telegramUser.username,
    languageCode: telegramUser.language_code === 'ru' ? 'ru' : 'en',
    createdAt: now,
    lastActiveAt: now,
  };

  db.data.users.push(newUser);
  await db.write();

  return newUser;
}

export async function updateUserActivity(id: number): Promise<void> {
  await db.read();

  const user = db.data.users.find(u => u.id === id);
  if (user) {
    user.lastActiveAt = new Date().toISOString();
    await db.write();
  }
}

export async function upsertUser(telegramUser: TelegramUser): Promise<User> {
  await db.read();

  const existingIndex = db.data.users.findIndex(u => u.id === telegramUser.id);
  const now = new Date().toISOString();

  if (existingIndex !== -1) {
    // Update existing user
    const user = db.data.users[existingIndex];
    user.firstName = telegramUser.first_name;
    user.lastName = telegramUser.last_name;
    user.username = telegramUser.username;
    user.languageCode = telegramUser.language_code === 'ru' ? 'ru' : 'en';
    user.lastActiveAt = now;
    await db.write();
    return user;
  }

  // Create new user
  const newUser: User = {
    id: telegramUser.id,
    firstName: telegramUser.first_name,
    lastName: telegramUser.last_name,
    username: telegramUser.username,
    languageCode: telegramUser.language_code === 'ru' ? 'ru' : 'en',
    createdAt: now,
    lastActiveAt: now,
  };

  db.data.users.push(newUser);
  await db.write();

  return newUser;
}

export async function getAllUsers(): Promise<User[]> {
  await db.read();
  return db.data.users;
}
