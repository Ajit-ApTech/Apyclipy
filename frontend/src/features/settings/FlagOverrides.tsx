import { useSyncExternalStore } from 'react'
import { t } from '../../i18n'
import { Row, Section } from '../../ui'
import {
  FLAG_DEFAULTS, FLAG_NAMES, FLAG_SPEC, flagOverride, setFlagOverride, subscribeFlags,
  type FlagName, type FlagValue,
} from '../../analytics/flags'

const LABELS: Record<FlagName, string> = {
  autoclip_safe_mode: 'Safe Mode (Disable experimental features)',
  remember_platforms: 'Remember selected platforms',
  one_click_paste_start: 'Auto-start after pasting video URL',
  link_import_without_whisper: 'Link import without waiting for local transcription',
  notify_on_done: 'Desktop notification when completed',
  publish_pack_v2: 'Copy caption and save video + cover together',
  render_top_first: 'Render highest-scored highlight clips first',
  clip_reasons: 'Show AI selection reason on clip cards',
  hide_legacy_entrypoints: 'Hide legacy production entrypoints',
  import_drop_zone: 'Centered drag & drop zone on home screen',
  track_overrides: 'Track custom parameter overrides',
  qa_gate_blocking: 'Production video quality QA checks',
  pkg_templates_v1: 'Visual template system v1',
  pkg_template_picker_visual: 'Visual template picker cards',
  mcp_v2_tools: 'MCP v2 Tools (Cancel tasks, editing styles)',
}

const VARIANT_LABELS: Record<string, string> = {
  button: '保持现在的按钮',
  autostart: '粘贴后自动开始',
  separate: '分开复制和导出',
  combined: '合成一个动作',
  limit10: '自动渲染前 10 条',
  top3: '自动渲染前 3 条',
  off: '关闭',
  shadow: '只记录，不拦截',
  block: '拦截（当前仍只记录）',
}

function choice(override: FlagValue | null): string {
  if (override === null) return ''
  return String(override)
}

/** The panel is a developer tool. `vite build` sets DEV to false, so release builds omit it. */
export function flagOverridesVisible(): boolean {
  return import.meta.env.DEV === true
}

/** Local overrides for internal checks. Remote flags are never requested from here. */
export default function FlagOverrides() {
  useSyncExternalStore(subscribeFlags, () => FLAG_NAMES.map(name => String(flagOverride(name))).join('|'), () => '')
  if (!flagOverridesVisible()) return null
  return <Section title={t('实验功能')} description={t('只在这台电脑上覆盖功能开关。关闭匿名统计后不会请求远程开关，没有覆盖时新功能保持关闭。')}>
    <div className="ac-rows">
      {FLAG_NAMES.map(name => {
        const spec = FLAG_SPEC[name]
        const override = flagOverride(name)
        const options = spec.kind === 'boolean'
          ? [{ value: 'true', label: t('开启') }, { value: 'false', label: t('关闭') }]
          : spec.variants.map(value => ({ value, label: t(VARIANT_LABELS[value] || value) }))
        return <Row key={name} label={t(LABELS[name])} hint={name}>
          <select className="ac-input ac-flag-select" aria-label={t(LABELS[name])} value={choice(override)} onChange={event => {
            const next = event.target.value
            if (!next) setFlagOverride(name, null)
            else if (spec.kind === 'boolean') setFlagOverride(name, next === 'true')
            else setFlagOverride(name, next)
          }}>
            <option value="">{t('跟随默认')} · {spec.kind === 'boolean' ? (FLAG_DEFAULTS[name] ? t('开启') : t('关闭')) : t(VARIANT_LABELS[String(FLAG_DEFAULTS[name])] || String(FLAG_DEFAULTS[name]))}</option>
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Row>
      })}
    </div>
  </Section>
}
