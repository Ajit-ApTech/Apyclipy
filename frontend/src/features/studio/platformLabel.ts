/** Localized display name for a platform strategy id; the single source for Studio UI labels. */
export function platformLabel(id: string): string {
  switch (id) {
    case 'douyin': return 'Douyin'
    case 'tiktok': return 'TikTok'
    case 'instagram_reels': return 'Instagram Reels'
    case 'youtube_shorts': return 'YouTube Shorts'
    case 'youtube_long': return 'YouTube Video'
    case 'bilibili': return 'Bilibili'
    case 'xiaohongshu': return 'Xiaohongshu'
    case 'original': return 'Original'
    default: return 'Platform'
  }
}
