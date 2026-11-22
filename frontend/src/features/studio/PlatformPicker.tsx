import { useEffect, useState } from 'react'
import { studioApi } from './api'
import { platformLabel } from './platformLabel'
import type { PlatformStrategySummary } from './types'

const fallback: PlatformStrategySummary[] = [
  { id: 'douyin', label: '抖音', aspect: 'portrait', duration_policy: 'short', min_recommended_duration_sec: 15, max_duration_sec: null, transport: 'download_only', transport_platform: null },
  { id: 'tiktok', label: 'TikTok', aspect: 'portrait', duration_policy: 'short', min_recommended_duration_sec: 15, max_duration_sec: null, transport: 'upload_post', transport_platform: 'tiktok' },
  { id: 'youtube_shorts', label: 'YouTube Shorts', aspect: 'portrait', duration_policy: 'short', min_recommended_duration_sec: 15, max_duration_sec: 180, transport: 'upload_post', transport_platform: 'youtube' },
  { id: 'youtube_long', label: 'YouTube 视频', aspect: 'landscape', duration_policy: 'long', min_recommended_duration_sec: 180, max_duration_sec: null, transport: 'upload_post', transport_platform: 'youtube' },
  { id: 'bilibili', label: 'B站', aspect: 'landscape', duration_policy: 'adaptive', min_recommended_duration_sec: 180, max_duration_sec: null, transport: 'bilibili_direct', transport_platform: 'bilibili' },
  { id: 'xiaohongshu', label: '小红书', aspect: 'portrait', duration_policy: 'short', min_recommended_duration_sec: 20, max_duration_sec: null, transport: 'download_only', transport_platform: null },
]

function summary(strategy: PlatformStrategySummary): string {
  if (strategy.duration_policy === 'long') return 'Full Landscape'
  if (strategy.duration_policy === 'short') return 'Short Video'
  return 'Adaptive Clip'
}

function PlatformIcon({ id }: { id: string }) {
  if (id === 'tiktok') {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
      </svg>
    )
  }
  if (id === 'douyin') {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    )
  }
  if (id === 'youtube_shorts' || id === 'youtube_long') {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (id === 'bilibili') {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="15" x="2" y="6" rx="3" />
        <path d="m17 2-3 4M7 2l3 4" />
        <line x1="8" x2="8.01" y1="12" y2="12" strokeWidth="2.5" />
        <line x1="16" x2="16.01" y1="12" y2="12" strokeWidth="2.5" />
      </svg>
    )
  }
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  )
}

export default function PlatformPicker({ value, onChange, disabled = false }: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  const [strategies, setStrategies] = useState<PlatformStrategySummary[]>(fallback)
  useEffect(() => {
    let active = true
    void studioApi.platformStrategies().then(data => { if (active && data.strategies.length) setStrategies(data.strategies) }).catch(() => undefined)
    return () => { active = false }
  }, [])
  const toggle = (id: string) => {
    if (disabled) return
    const selected = value.includes(id)
    const next = selected ? value.filter(item => item !== id) : [...value, id]
    onChange(next.length ? next : [id])
  }
  return <fieldset className="studio-platform-picker" disabled={disabled}>
    <legend style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <span>Where do you want to publish?</span>
      <span className="studio-muted" style={{ fontSize: '12px', fontWeight: 'normal' }}>
        Selected {value.length} platform{value.length > 1 ? 's' : ''}
      </span>
    </legend>
    <p className="studio-muted">Select platforms; content analysis is reused across all chosen platforms.</p>
    <div className="studio-platform-options">
      {strategies.filter(strategy => strategy.id !== 'original').map(strategy => {
        const selected = value.includes(strategy.id)
        const aspectTag = strategy.aspect === 'landscape' ? '16:9' : '9:16'
        return <button type="button" key={strategy.id} className={`studio-platform-option${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => toggle(strategy.id)}>
          <div className="studio-platform-option-header">
            <div className="studio-platform-icon-wrap" style={{ color: selected ? 'var(--ac-accent)' : 'var(--ac-sub)' }}>
              <PlatformIcon id={strategy.id} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="ac-mono" style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'var(--ac-line-2)', color: 'var(--ac-sub)' }}>
                {aspectTag}
              </span>
              <span className={`studio-platform-check${selected ? ' is-checked' : ''}`}>
                {selected ? '✓' : ''}
              </span>
            </div>
          </div>
          <div className="studio-platform-option-body">
            <b>{platformLabel(strategy.id)}</b>
            <span>{summary(strategy)}</span>
          </div>
        </button>
      })}
    </div>
  </fieldset>
}
