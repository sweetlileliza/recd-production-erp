export type PanelType =
  | 'COMPLEX BASE'
  | 'SIMPLE BASE'
  | 'COMPLEX ALT'
  | 'SIMPLE ALT'
  | 'ANIMATED'
  | 'NONE'

export type PanelStatus =
  | 'Not Started'
  | 'Sketched'
  | 'Lined'
  | 'Colored'
  | 'Completed'

export const PRICING_RULES: Record<PanelType, number> = {
  'COMPLEX BASE': 36,
  'SIMPLE BASE': 18,
  'COMPLEX ALT': 9,
  'SIMPLE ALT': 3,
  'ANIMATED': 0, // Custom / tag-based pricing
  'NONE': 0,
}

export interface Panel {
  id: string
  panelLetter: string // 'A', 'B', 'C'
  panelCode: string // '1A', '1B'
  type: PanelType
  price: number
  scriptSegment: string
  directionNotes: string
  status: PanelStatus
  sketchOk: boolean
  driveLink: string
  artist?: string
  updatedAt: string
}

export interface ArtistSplit {
  artistName: string
  percentage: number // percentage e.g. 50, 70, 30
  amount: number // calculated dollar amount from shot total
  notes?: string
}

export interface Shot {
  id: string
  shotNumber: number
  sceneIntro: string
  isAnimated: boolean
  animationTags?: string[]
  customPrice?: number
  assignedArtist?: string
  artistOptIns?: string[]
  artistSplits?: ArtistSplit[]
  latestAnimationUpdate?: string
  deadline?: string
  bgAssistanceNeeded?: boolean
  notes?: string
  driveFolderUrl?: string
  updatedAt: string
  panels: Panel[]
}

export type SetupStepStatus = 'not_started' | 'in_progress' | 'completed'

export interface InitialSetupItem {
  title: string
  status: SetupStepStatus
  notes: string
  link: string
  updatedAt: string
}

export interface InitialSetup {
  storyPitch: InitialSetupItem
  melodyStyle: InitialSetupItem
  writing: InitialSetupItem
  pianodemo: InitialSetupItem
  scratchTrack: InitialSetupItem
}

export type VoiceActorStatus =
  | 'pending'
  | 'auditioned'
  | 'cast'
  | 'lines_received'
  | 'mixed'

export interface VoiceRole {
  id: string
  characterName: string
  voiceActor: string
  status: VoiceActorStatus
  notes: string
  auditionLink?: string
  linesLink?: string
  updatedAt: string
}

export interface PostProduction {
  audioFinalMix: {
    completed: boolean
    notes: string
    link: string
    updatedAt: string
  }
  videoFinalMix: {
    completed: boolean
    notes: string
    link: string
    updatedAt: string
  }
  isReleased: boolean
  releasedAt?: string
  releaseUrl?: string
}

export interface ArtistPreference {
  artistName: string
  maxShots: number // Required
  preferredShots: number[] // Max 5 shot numbers (1st, 2nd, 3rd, 4th, 5th)
  avoidShots: number[] // Shots they absolutely do not want
  notes?: string
  updatedAt: string
}

export interface Project {
  id: string
  title: string
  director: string
  resolution: string
  targetDeadline?: string
  refDocUrl?: string
  status: 'active' | 'in_progress' | 'released' | 'archived'
  createdAt: string
  updatedAt: string
  initialSetup: InitialSetup
  shots: Shot[]
  voiceCasting: VoiceRole[]
  postProduction: PostProduction
  artistPreferences?: ArtistPreference[]
}

export interface BottleneckItem {
  id: string
  projectId: string
  projectTitle: string
  type: 'director_setup' | 'unassigned_shot' | 'artist_lagging' | 'pending_sketch_review'
  severity: 'low' | 'medium' | 'high'
  responsibleParty: string
  title: string
  details: string
  lastUpdated: string
  daysInactive: number
}

export interface TeamMember {
  id: string
  name: string
  isArtist: boolean
  isVoiceActor: boolean
  email?: string
  discordHandle?: string
  specialty?: string
  activeShots?: number
}

export type UserRole = 'producer' | 'director' | 'team_member'

export interface CurrentUser {
  role: UserRole
  name: string
  isArtist?: boolean
  isVoiceActor?: boolean
  teamMemberId?: string
}
