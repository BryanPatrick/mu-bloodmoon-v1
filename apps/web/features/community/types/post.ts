export type CommunityPostType = 'TEXT' | 'IMAGE' | 'GALLERY' | 'GIF' | 'ARTICLE'
export type CommunityPostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
export type CommunityReactionType = 'LIKE' | 'HONOR' | 'POWER' | 'RARE' | 'VICTORY'
export type CommunityFeedLabel = 'FOLLOWING' | 'TRENDING' | 'SPONSORED' | 'OFFICIAL' | 'ACHIEVEMENT' | 'MARKETPLACE' | 'EVENT' | 'GUIDE'

export type CommunityMedia = {
  id: string
  kind: 'IMAGE' | 'GIF'
  url: string
  mimeType: string
  width: number
  height: number
}

export type CommunityCommentView = {
  id: string
  content: string
  edited: boolean
  createdAt: string
  author: { id: string, username: string, name: string, avatarUrl?: string | null }
  reactions: Array<{ type: CommunityReactionType, accountId: string }>
  replies: CommunityCommentView[]
}

export type CommunityPostView = {
  id: string
  type: CommunityPostType
  visibility: CommunityPostVisibility
  title?: string | null
  content: string
  media: CommunityMedia[]
  tags: string[]
  mentions: string[]
  edited: boolean
  editedAt?: string | null
  sponsored: boolean
  official: boolean
  isPinned: boolean
  isFeatured: boolean
  createdAt: string
  author: {
    id: string
    username: string
    name: string
    avatarUrl?: string | null
  }
  comments: number
  reactions: number
  saves: number
  reposts: number
  commentItems: CommunityCommentView[]
  reactionItems: Array<{ type: CommunityReactionType, accountId: string }>
  labels: CommunityFeedLabel[]
  viewer: { saved: boolean, reposted: boolean, reactions: CommunityReactionType[] }
}
