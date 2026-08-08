import type { CommunityCommentView, CommunityPostView } from '~/features/community/types/post'

/** Converts a raw CommunityPost API response (feed item, getPost, or a
 * comments-page entry) into the shape components expect. Shared by the feed
 * page, the post permalink modal, and CommunityPostCard's "load more
 * comments" -- one mapping, not three divergent ones. */
export const normalizePost = (raw: any): CommunityPostView => ({
  id: raw.id,
  type: raw.type || 'TEXT',
  visibility: raw.visibility || 'PUBLIC',
  title: raw.title,
  content: raw.content || '',
  media: Array.isArray(raw.media) ? raw.media : [],
  tags: Array.isArray(raw.tags) ? raw.tags : [],
  mentions: Array.isArray(raw.mentions) ? raw.mentions : [],
  edited: Boolean(raw.edited),
  editedAt: raw.editedAt,
  sponsored: Boolean(raw.sponsored),
  official: Boolean(raw.official),
  isPinned: Boolean(raw.isPinned),
  isFeatured: Boolean(raw.isFeatured),
  createdAt: raw.createdAt,
  author: {
    id: raw.author?.id || raw.authorId,
    username: raw.author?.username || 'jogador',
    name:
      raw.author?.communityProfile?.displayName ||
      raw.author?.name ||
      raw.author?.username ||
      'Jogador',
    avatarUrl: raw.author?.communityProfile?.avatarUrl
  },
  comments: raw._count?.comments || 0,
  reactions: raw._count?.reactions || 0,
  saves: raw._count?.saves || 0,
  reposts: raw._count?.reposts || 0,
  reactionItems: Array.isArray(raw.reactions) ? raw.reactions : [],
  labels: Array.isArray(raw.labels) ? raw.labels : [],
  viewer: {
    saved: Boolean(raw.viewer?.saved),
    reposted: Boolean(raw.viewer?.reposted),
    reactions: Array.isArray(raw.viewer?.reactions) ? raw.viewer.reactions : []
  },
  commentItems: (Array.isArray(raw.comments) ? raw.comments : []).map(normalizeComment)
})

export function normalizeComment(raw: any): CommunityCommentView {
  return {
    id: raw.id,
    content: raw.content || '',
    edited: Boolean(raw.edited),
    createdAt: raw.createdAt,
    author: {
      id: raw.author?.id || raw.authorId,
      username: raw.author?.username || 'jogador',
      name:
        raw.author?.communityProfile?.displayName ||
        raw.author?.name ||
        raw.author?.username ||
        'Jogador',
      avatarUrl: raw.author?.communityProfile?.avatarUrl
    },
    reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
    replies: (Array.isArray(raw.replies) ? raw.replies : []).map(normalizeComment)
  }
}
