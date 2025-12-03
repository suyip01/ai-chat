

export enum CharacterStatus {
  ONLINE = '在线',
  OFFLINE = '离线',
  BUSY = '忙碌'
}

export enum MessageType {
  TEXT = 'text',
  SYSTEM = 'system'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface UserPersona {
  gender: 'male' | 'female' | 'secret';
  name: string;
  age: string;
  profession: string;
  basicInfo: string;
  personality: string;
  avatar?: string;
}

export interface Character {
  id: string;
  name: string;
  avatar: string;
  profileImage?: string; // New field for the original uncropped image
  status: CharacterStatus;
  bio: string;
  tags: string[];
  isPinned?: boolean;
  relationshipLevel?: number; // 0-100
  creator?: string; 
  playCount?: string;
  
  // Profile specific fields
  age?: string;
  profession?: string;
  gender?: string;
  roleType?: string; // '原创角色', etc.
  isOriginal?: boolean;
  oneLinePersona?: string;
  personality?: string;
  currentRelationship?: string;
  plotTheme?: string;
  plotDescription?: string;
  openingLine?: string;
  
  // Advanced fields
  styleExamples?: string[];
  hobbies?: string;
  experiences?: string;
  visibility?: 'public' | 'private';
  isPublic?: boolean;
}

export interface Message {
  id: string;
  senderId: string; // 'user' or characterId
  text: string;
  timestamp: Date;
  type: MessageType;
  quote?: string;
  read?: boolean;
}

export interface ChatPreview {
  characterId: string;
  character: Character;
  lastMessage: Message;
  unreadCount: number;
}

export interface ChatSession {
  characterId: string;
  messages: Message[];
}

export enum NavTab {
  HOME = 'home',
  CHAT = 'chat',
  ME = 'me'
}

export interface UserProfile {
  nickname: string;
  avatar: string;
  email: string;
  usedCount?: number;
}
