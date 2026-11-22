import { useTranslation } from 'react-i18next'
import { getLocale, t } from '../../i18n'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Project, Clip } from '../../store/useProjectStore'
import { Btn, Section, Dialog, fmtDuration } from '../../ui'
import { studioApi, errorText } from './api'
import { failureSettings, sourceFailure } from './importReadiness'
import { browserCookieRecovery, stageBrowserCookieRecovery } from './browserCookieRecovery'
import { analysisFailureText, analysisPageFailure, receiptFailureInfo, failureAction, isTranscriptionInstall } from './failureAction'
import { weakLocalTimelineFailure } from '../../utils/timelineFailure'
import FailureActions, { FailureCopy } from './FailureActions'
import { analysisProviderId, listSwitchModelOptions, usableConnectionCount } from './switchModelOptions'
import { modelSettingsApi, type ModelSettings } from '../settings/modelSettingsApi'
import { forSave } from '../settings/modelSettingsLogic'
import { syncFollowingCover } from '../settings/modelDefaults'
import { displayedProgress, studioRunProgress } from './studioProgress'
import { recordSuccess } from './etaModel'
import { CONTINUE_PARAM, settingsReturnUrl } from './settingsReturn'
import { useWorkspace } from './useWorkspace'
import { Scene, Draft } from './types'
import ExportHistory from './ExportHistory'
import DraftResultCard from './DraftResultCard'
import OutputVariantCard from './OutputVariantCard'
import { platformLabel } from './platformLabel'
import { flagAssigned, flagEnabled } from '../../analytics/flags'
import { trackLegacyEntry } from '../../analytics/studio'
import { workflow } from '../../analytics/observer'
import { legacyEntrypointsHidden } from './legacyEntrypoints'
import { clearCompletionBadge, subscribeCompletionNotice, type NoticeKind } from './noticeRuntime'
import { noticeCopy } from './completionNotice'
import { dismissMorePlatformBanner, hasSuccessHistory, morePlatformBannerSeen, stashReuseImport, suggestAnotherPlatform } from './platformMemory'
import { followOutputLeave } from './overrides'

import './studio.css'
import './quick-output.css'

function formatLiveDetail(detail: string | undefined, _t?: unknown): string {
  if (!detail) return ''
  const dlMatch = detail.match(/Downloading video:\s*([\d.]+)\s*MB downloaded/i)
  if (dlMatch) {
    return `Downloading video: ${dlMatch[1]} MB downloaded...`
  }
  const streamMatch = detail.match(/(?:模型持续返回中[（(]已接收|AI model streaming in progress \()\s*(\d+)\s*(?:字[）)]|chars received\))/i)
  if (streamMatch) {
    return `AI model streaming in progress (${streamMatch[1]} chars received)`
  }
  const failMatch = detail.match(/(?:处理失败|Processing failed)[：:]\s*(.+)/i)
  if (failMatch) {
    return `Processing failed: ${failMatch[1]}`
  }
  const map: Record<string, string> = {
    '模型思考中': 'AI model thinking...',
    '开始片段定位': 'Locating highlight segments...',
    '片段定位完成': 'Highlight segments located',
    '片段挑选完成': 'Highlight clips selected',
    '标题生成完成': 'Titles generated',
    '开始内容分析': 'Analyzing video content...',
    '时间线提取完成': 'Timeline extraction completed',
    '内容分析完成': 'Content analysis completed',
    '开始视频导出': 'Exporting video clips...',
    '视频导出完成': 'Video export completed',
    '视频切割': 'Cutting video clips...',
    '视频切割完成': 'Video clips cut successfully',
    '处理完成': 'Processing complete',
    '字幕处理完成': 'Subtitles processed',
    '视频下载完成': 'Video download completed',
    '正在生成字幕': 'Generating subtitles...',
    '正在合并音视频': 'Merging audio and video...',
    '正在生成可发布成片': 'Rendering final clips...',
    '素材准备': 'Preparing media',
    '字幕处理': 'Processing subtitles',
    '内容分析': 'Analyzing content',
    '片段定位': 'Locating segments',
    '视频导出': 'Exporting video',
    '下载中': 'Downloading',
  }
  if (map[detail]) return map[detail]
  let result = detail
  for (const [k, v] of Object.entries(map)) {
    if (result.includes(k)) {
      result = result.split(k).join(v)
    }
  }
  return result
}

function formatSecondsToClock(sec: number): string {
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const remainSec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(remainSec)}` : `${pad(m)}:${pad(remainSec)}`
}

function formatSegmentText(workspace: any, project: any, _t?: unknown): string | null {
  const sw = workspace?.source_meta?.source_window || project?.settings?.smart_import?.source_window
  if (sw && typeof sw.end === 'number' && sw.end > (sw.start || 0)) {
    const startStr = formatSecondsToClock(sw.start || 0)
    const endStr = formatSecondsToClock(sw.end)
    const durStr = formatSecondsToClock(sw.end - (sw.start || 0))
    return `${startStr} — ${endStr} (Duration: ${durStr})`
  }
  const tr = workspace?.source_meta?.time_range
  if (tr && typeof tr === 'string' && tr.includes('-')) {
    const parts = tr.split('-').map(Number)
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const startStr = formatSecondsToClock(parts[0])
      const endStr = formatSecondsToClock(parts[1])
      const durStr = formatSecondsToClock(parts[1] - parts[0])
      return `${startStr} — ${endStr} (Duration: ${durStr})`
    }
  }
  return null
}

function getMaxClipsText(workspace: any, project: any, _t?: unknown): string | null {
  const val = (workspace?.plan?.overrides as any)?.max_clips || workspace?.source_meta?.max_clips || project?.settings?.smart_import?.max_clips
  if (val && Number(val) > 0) {
    return `${val} clip${Number(val) > 1 ? 's' : ''}`
  }
  return null
}

function getQualityText(workspace: any, project: any, _t?: unknown): string | null {
  const val = workspace?.source_meta?.download_quality || project?.settings?.smart_import?.download_quality
  if (val === '720p') return '720p HD (High Speed)'
  if (val === '1080p') return '1080p Full HD'
  return null
}

export default function StudioResults({ project, children, onCreateCollection, onReload }: { project: Project; children: ReactNode; onCreateCollection: () => void; onReload: () => void }) {
  useTranslation()
  const navigate = useNavigate()
  // back from a successful settings save -> 「继续制作」 is the primary action.
  const returnedFromSettings = new URLSearchParams(useLocation().search).get(CONTINUE_PARAM) === '1'
  const {workspace,error,loading,loaded,refresh} = useWorkspace(project.id)
  const [history, setHistory] = useState(false)
  const [busy,setBusy] = useState('')
  const [actionError,setActionError] = useState('')
  const [preview,setPreview] = useState<Scene|null>(null)
  const [exporting,setExporting] = useState<Draft|null>(null)
  const [aiSettings, setAiSettings] = useState<ModelSettings | null>(null)
  useEffect(() => {
    let live = true
    modelSettingsApi.get().then(v => { if (live) setAiSettings(v) }).catch(() => { if (live) setAiSettings(null) })
    return () => { live = false }
  }, [])
  const goal = project.settings?.creative?.goal || project.processing_config?.creative?.goal || 'content'
  const visual = goal !== 'content'
  const sourceDuration=workspace.plan?.source_duration ?? workspace.analysis?.coverage?.duration
  const managed = visual || !!project.settings?.smart_import || !!project.processing_config?.smart_import
  const automatic = !!workspace.generation?.auto_start
  const hideLegacy = legacyEntrypointsHidden(flagEnabled('hide_legacy_entrypoints'), managed || automatic)
  const noteLegacy = (action: 'plan_adjust' | 'collection' | 'export_confirm') => trackLegacyEntry({ legacy_action: action }, flagAssigned('hide_legacy_entrypoints'))
  const failedCode = workspace.analysis?.error_code || workspace.generation?.error_code
  const sourceUnusable = workspace.analysis?.status === 'failed' && sourceFailure(failedCode)
  const cookieRecovery = workspace.analysis?.status === 'failed' && browserCookieRecovery(failedCode, workspace.analysis?.error)
  const canRetryAnalysis = automatic ? !workspace.output_variants?.length : !(workspace.drafts.length || project.clips?.length || project.collections?.length || workspace.jobs?.some(job => job.status === 'completed'))
  const whisperSettings = workspace.analysis?.status === 'failed' && !sourceUnusable && failureSettings(failedCode).label === '打开转写设置' ? failureSettings(failedCode) : null
  const recoveryAction = failureAction(failedCode)
  const installTranscription = isTranscriptionInstall(recoveryAction) ? recoveryAction : null
  // the generation status covers this round only; earlier rounds' failures stay listed (count from settle)
  const notRedone = workspace.generation?.not_redone_failed_count || 0
  const generationDescription = workspace.generation?.status === 'completed' && notRedone > 0 ? `Run completed; ${notRedone} unfinished clip(s) can be retried.`
    : workspace.generation?.status === 'completed' ? 'Clips generated successfully for chosen platforms.'
    : workspace.generation?.status === 'partial' ? 'Some clips completed; unfinished clips can be retried.'
      : workspace.generation?.status === 'failed' ? (sourceUnusable ? 'This media cannot be processed' : 'Generation incomplete') : 'AI is creating clips for your chosen platforms.'
  const variantDraft = (draftId: string) => workspace.drafts.find(draft => draft.id === draftId)
  const variantJob = (jobId?: string) => workspace.jobs.find(job => job.job_id === jobId)
  const latest = useRef(workspace)
  latest.current = workspace
  const [doneNote, setDoneNote] = useState<NoticeKind | null>(null)
  useEffect(() => subscribeCompletionNotice((key, kind) => {
    if (key === project.id) setDoneNote(kind)
  }), [project.id])
  useEffect(() => {
    const clear = () => { if (document.visibilityState === 'visible') void clearCompletionBadge() }
    window.addEventListener('focus', clear)
    document.addEventListener('visibilitychange', clear)
    const stopLeave = followOutputLeave(project.id, () => {
      const current = latest.current
      return {
        createdAt: current.generation?.created_at,
        status: current.generation?.status,
        completed: (current.output_variants || []).filter(item => item.status === 'completed').length,
      }
    })
    return () => {
      window.removeEventListener('focus', clear)
      document.removeEventListener('visibilitychange', clear)
      stopLeave()
    }
  }, [project.id])
  // A retry whose response was lost is still watched: the open generation attempt on the snapshot is the source.
  useEffect(()=>{workflow.adoptOpenAttempt(project.id, workspace)},[project.id, workspace.attempts])
  useEffect(()=>{if(workspace.analysis && workspace.analysis.status!=='running' && project.status!=='completed') onReload()},[workspace.analysis?.status])
  const act = async (key: string, fn:()=>Promise<void>) => {setBusy(key);setActionError('');try{await fn();refresh()}catch(e){setActionError(t(errorText(e)))}finally{setBusy('')}}
  const [progressNow, setProgressNow] = useState(() => Date.now())
  const progressRun = workspace.analysis?.status === 'running' || workspace.jobs.some(job => job.status === 'queued' || job.status === 'running')
  useEffect(() => {
    if (!progressRun) return
    const timer = window.setInterval(() => setProgressNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [progressRun])
  const progressFloor = useRef(0)
  const progressKey = `${project.id}:${workspace.analysis?.run_id || ''}:${workspace.analysis?.status || ''}`
  const progressKeySeen = useRef(progressKey)
  if (progressKeySeen.current !== progressKey) {
    progressKeySeen.current = progressKey
    progressFloor.current = 0
  }
  const progressRaw = studioRunProgress({
    analysis: workspace.analysis,
    generation: workspace.generation,
    jobs: workspace.jobs,
    source_duration_sec: typeof sourceDuration === 'number' ? sourceDuration : null,
    concurrency: 1,
  }, progressNow)
  const progressShown = progressRaw && displayedProgress(progressRaw, progressFloor.current)
  if (progressShown) progressFloor.current = progressShown.floor
  const progress = progressShown?.view ?? null
  const etaPosted = useRef('')
  useEffect(() => {
    const initial = progress?.etaInitialMin
    const attempt = workspace.generation?.attempt_id || workspace.analysis?.run_id || ''
    if (!initial || !attempt || etaPosted.current === attempt) return
    etaPosted.current = attempt
    void studioApi.reportEta(project.id, initial).catch(() => undefined)
  }, [progress?.etaInitialMin, workspace.generation?.attempt_id, workspace.analysis?.run_id, project.id])
  useEffect(() => {
    const status = workspace.generation?.status
    if (status !== 'completed' && status !== 'partial') return
    const provider = workspace.generation?.provider || workspace.analysis?.provider
    const sourceMin = typeof sourceDuration === 'number' && sourceDuration > 0 ? sourceDuration / 60 : 0
    const started = workspace.generation?.created_at || workspace.analysis?.created_at
    const stamp = workspace.generation?.attempt_id || started || ''
    if (!provider || !(sourceMin > 0) || !started || !stamp) return
    const storageKey = `autoclip.eta.recorded.${project.id}`
    try { if (sessionStorage.getItem(storageKey) === stamp) return } catch { /* ignore */ }
    const elapsed = Math.max(0, (Date.now() - Date.parse(started)) / 1000)
    if (!(elapsed > 0)) return
    try { sessionStorage.setItem(storageKey, stamp) } catch { /* ignore */ }
    recordSuccess({ provider, source_min: sourceMin, elapsed_sec: elapsed })
  }, [workspace.generation?.status, workspace.generation?.attempt_id, workspace.generation?.provider, workspace.generation?.created_at, workspace.analysis?.provider, workspace.analysis?.created_at, sourceDuration, project.id])

  const billable = Math.max(workspace.analysis?.billable_calls_before_failure || 0, workspace.generation?.billable_calls_before_failure || 0)
  const switchOptions = listSwitchModelOptions(aiSettings, {
    connectionId: aiSettings?.analysis?.connection_id,
    model: aiSettings?.analysis?.model,
  })
  const analysisConnection = aiSettings?.connections?.find(c => c.id === aiSettings.analysis?.connection_id)
  const failureInfo = (extra?: { error?: string }) => ({
    error: extra?.error ?? workspace.analysis?.error,
    ...(receiptFailureInfo(workspace.attempts, workspace.analysis?.run_id) || analysisPageFailure(workspace.analysis, workspace.generation)),
    phase: workspace.analysis?.phase,
    billable_calls_before_failure: billable,
    quota_precheck: workspace.generation?.quota_precheck || workspace.analysis?.quota_precheck,
    // N3: pass through so FailureActions can unlock after 测试连接 clears the stamp.
    quota_exhausted_at: analysisConnection?.quota_exhausted_at,
    connection_count: usableConnectionCount(aiSettings),
    provider: analysisProviderId(aiSettings),
  })
  const switchModelAndRetry = async (choice: { connectionId: string; model: string }) => {
    if (!aiSettings) return
    const saved = await modelSettingsApi.save(forSave(syncFollowingCover(aiSettings, {
      ...aiSettings,
      analysis: {
        connection_id: choice.connectionId,
        model: choice.model,
        capability: aiSettings.analysis?.capability || 'auto',
        model_source: 'user',
      },
    })))
    setAiSettings(saved)
    await studioApi.retry(project.id, { retry_kind: 'switch_model' })
  }
  const createLegacy = (clip: Clip) => act(clip.id, async()=>{const draft=await studioApi.create(project.id,[clip.id],clip.generated_title||clip.title||"New Clip");navigate(`/project/${project.id}/studio/${draft.id}`)})
  const genDone = workspace.generation?.status === 'completed' || workspace.generation?.status === 'partial'
  const [showMorePlatform, setShowMorePlatform] = useState(() => genDone && hasSuccessHistory() && !morePlatformBannerSeen())
  const usedFirstWindow = Boolean(workspace.plan?.overrides?.source_window)
  const [showFullImportTip, setShowFullImportTip] = useState(() => genDone && usedFirstWindow)
  useEffect(() => {
    if (!genDone) return
    if (hasSuccessHistory() && !morePlatformBannerSeen()) setShowMorePlatform(true)
    if (usedFirstWindow) setShowFullImportTip(true)
  }, [genDone, workspace.generation?.status, usedFirstWindow])
  const alreadyPlatforms = workspace.generation?.requested_platforms || []
  const morePlatformId = suggestAnotherPlatform(getLocale(), alreadyPlatforms)
  const morePlatformLabel = morePlatformId === 'xiaohongshu' ? 'Xiaohongshu'
    : morePlatformId === 'youtube_shorts' ? 'Shorts'
    : platformLabel(morePlatformId)
  const startAnotherPlatform = () => {
    dismissMorePlatformBanner()
    setShowMorePlatform(false)
    stashReuseImport({
      platforms: [morePlatformId],
      sourceUrl: project.source_url || undefined,
      sourceMeta: {
        source_url: project.source_url,
        source_file: project.source_file,
        video_path: project.video_path,
        project_id: project.id,
      },
    })
    navigate('/')
  }
  return <div className="studio-results">
    {doneNote && <p className="studio-done-note" role="status">{t(noticeCopy(doneNote))}</p>}
    {showMorePlatform && genDone && <div className="studio-more-platform" role="status" data-testid="t1-more-platform">
      <p className="studio-muted">{`You can also create a ${morePlatformLabel} version`}</p>
      <div className="studio-actions">
        <Btn size="sm" variant="cta" onClick={startAnotherPlatform}>Create Another Version</Btn>
        <Btn size="sm" variant="text" onClick={() => { dismissMorePlatformBanner(); setShowMorePlatform(false) }}>Dismiss</Btn>
      </div>
    </div>}
    {showFullImportTip && genDone && usedFirstWindow && <div className="studio-more-platform" role="status" data-testid="t2-full-import-tip">
      <p className="studio-muted">Settings verified. You can now import the full video.</p>
      <div className="studio-actions">
        <Btn size="sm" variant="cta" onClick={() => { setShowFullImportTip(false); navigate('/') }}>Re-import Full Video</Btn>
        <Btn size="sm" variant="text" onClick={() => setShowFullImportTip(false)}>Dismiss</Btn>
      </div>
    </div>}
    {managed && !automatic && !hideLegacy && <div className="studio-row"><span className="studio-muted">{sourceDuration!=null?`Source duration: ${fmtDuration(sourceDuration)} · `:''}{workspace.analysis?.status==='awaiting_confirmation'?'New production plan pending confirmation.':'Production Results & Editor'}</span><Btn size="sm" disabled={workspace.analysis?.status==='running'} onClick={()=>{ noteLegacy('plan_adjust'); navigate(`/import/${project.id}`) }}>{workspace.analysis?.status==='awaiting_confirmation'?'Confirm Plan':'Adjust Plan'}</Btn></div>}
    {automatic && workspace.generation?.skipped?.map(item=><p key={item.strategy_id} className="studio-output-hint">{`Skipped ${platformLabel(item.strategy_id)}: ${t(item.reason)}`}</p>)}
    {!(workspace.analysis?.status==='awaiting_confirmation' && !workspace.drafts.length && !project.clips?.length && !project.collections?.length) && <Section title="Clips & Highlights" count={automatic ? (workspace.output_variants?.length || 0) : workspace.drafts.length+(project.clips?.length||0)+(project.collections?.length||0)} description={automatic ? generationDescription : visual ? "Highlights prepared as drafts; can be exported after processing." : "Clips and highlights are ready to download or edit."} right={<div className="studio-actions"><Btn size="sm" onClick={()=>setHistory(true)}>Export History</Btn>{!managed && !hideLegacy && <Btn size="sm" onClick={()=>{ noteLegacy('collection'); onCreateCollection() }}>New Collection</Btn>}</div>}>
      {progress && <div className="studio-processing-card" role="status">
        <div className="studio-stage-chips">
          <span className={`studio-stage-chip ${progress.percent > 0 && progress.percent <= 30 ? 'is-active' : progress.percent > 30 ? 'is-done' : ''}`}>
            {progress.percent > 30 ? '✓' : '1.'} Download & Transcribe
          </span>
          <span className={`studio-stage-chip ${progress.percent > 30 && progress.percent <= 80 ? 'is-active' : progress.percent > 80 ? 'is-done' : ''}`}>
            {progress.percent > 80 ? '✓' : '2.'} AI Analysis & Scoring
          </span>
          <span className={`studio-stage-chip ${progress.percent > 80 ? 'is-active' : ''}`}>
            3. Auto Editing & Video Render
          </span>
        </div>

        <div className="studio-progress" role="progressbar" aria-busy={progress.indeterminate || undefined} aria-valuenow={progress.indeterminate ? undefined : progress.percent} aria-valuemin={progress.indeterminate ? undefined : 0} aria-valuemax={progress.indeterminate ? undefined : 100} aria-valuetext={t(progress.label)}>
          <div className="studio-progress-track">
            <div className={`studio-progress-fill${progress.indeterminate ? ' studio-progress-fill--busy' : ''}`} style={progress.indeterminate ? undefined : { width: `${progress.percent}%` }} />
          </div>
          <div className="studio-progress-meta">
            <span style={{ fontWeight: 500, color: 'var(--ac-ink)' }}>{t(progress.label)}</span>
            {!progress.indeterminate && <span className="ac-mono" style={{ fontWeight: 600 }}>{progress.percent}%</span>}
          </div>
        </div>

        <div className="studio-live-indicator-badge">
          <span className="studio-live-pulse-dot" />
          <span>{formatLiveDetail(progress.detail !== progress.label ? progress.detail : undefined, t) || 'AI background model processing in progress...'}</span>
        </div>

        <p className="studio-muted" style={{ marginTop: '10px' }}>{[
          progress.elapsedMinutes == null ? '' : progress.elapsedMinutes < 1 ? 'Under 1 minute so far' : `About ${progress.elapsedMinutes} minutes elapsed`,
          progress.etaOverrun ? 'Taking a bit longer than estimated, still working' : (progress.etaMin != null ? `Estimated ~${progress.etaMin} minutes remaining` : ''),
          progress.modelBudget ? 'Model budget capped at 20 min' : '',
          progress.approximate ? 'Progress is an estimate based on current stage' : '',
        ].filter(Boolean).join(' · ')}</p>

        {progress.canLeave && <p className="studio-muted" style={{ fontSize: '12px', marginTop: '4px' }}>You can minimize to tray; we will notify you when clips are ready.</p>}
      </div>}
      {workspace.analysis?.status==='failed' && sourceUnusable && <div className="ac-empty" role="alert"><b>This video source could not be used</b><FailureCopy info={failureInfo()} message={analysisFailureText(workspace.analysis.error, workspace.analysis, workspace.generation)} /><div className="studio-actions"><Btn disabled={!!busy} onClick={()=>navigate('/')}>Try Another Video</Btn>{!hideLegacy && <Btn disabled={!!busy} onClick={()=>{ noteLegacy('plan_adjust'); navigate(`/import/${project.id}`) }}>Adjust Plan</Btn>}</div></div>}
      {cookieRecovery && <div className="ac-empty" role="alert"><b>Processing could not be completed</b><FailureCopy info={failureInfo()} message={analysisFailureText(workspace.analysis?.error, workspace.analysis, workspace.generation)} /><p className="studio-muted">Next step: Go back to import and select a logged-in browser before generating.</p><div className="studio-actions"><Btn variant="cta" disabled={!!busy} onClick={()=>navigate(stageBrowserCookieRecovery(project.source_url))}>Select Browser</Btn>{canRetryAnalysis && <Btn disabled={!!busy} loading={busy==='retry-analysis'} onClick={()=>act('retry-analysis', async()=>{await studioApi.retry(project.id)})}>Retry</Btn>}<Btn disabled={!!busy} onClick={()=>navigate('/')}>Try Another Video</Btn></div></div>}
      {workspace.analysis?.status==='failed' && whisperSettings && !cookieRecovery && <div className="ac-empty" role="alert"><b>Processing could not be completed</b><FailureCopy info={failureInfo()} message={analysisFailureText(workspace.analysis.error, workspace.analysis, workspace.generation)} /><div className="studio-actions">{installTranscription && <Btn variant="cta" disabled={!!busy} onClick={()=>navigate(installTranscription.destination)}>{t(installTranscription.label)}</Btn>}{canRetryAnalysis && <Btn disabled={!!busy} loading={busy==='retry-analysis'} onClick={()=>act('retry-analysis', async()=>{await studioApi.retry(project.id)})}>Retry</Btn>}{!installTranscription && <Btn disabled={!!busy} onClick={()=>navigate(whisperSettings.to)}>{t(whisperSettings.label)}</Btn>}{!hideLegacy && <Btn disabled={!!busy} onClick={()=>{ noteLegacy('plan_adjust'); navigate(`/import/${project.id}`) }}>Adjust Plan</Btn>}</div></div>}
      {workspace.analysis?.status==='failed' && !sourceUnusable && !whisperSettings && !cookieRecovery && <div className="ac-empty"><b>Processing could not be completed</b>
        <FailureActions info={failureInfo()}
          canRetry={canRetryAnalysis}
          returnedFromSettings={returnedFromSettings} busy={!!busy} retrying={busy==='retry-analysis'}
          repeatFailure={workspace.generation?.repeat_failure}
          resumePoint={workspace.resume_point}
          switchOptions={switchOptions}
          onSwitchModel={choice => act('retry-analysis', async () => { await switchModelAndRetry(choice) })}
          onRetry={()=>act('retry-analysis', async()=>{await studioApi.retry(project.id, { retry_kind: 'same' })})}
          onFreshRetry={()=>act('retry-analysis', async()=>{await studioApi.retry(project.id, { retry_kind: 'same', fresh: true })})}
          onSettings={destination=>navigate(settingsReturnUrl(destination, project.id))}>
          {!weakLocalTimelineFailure(failureInfo().error, failureInfo().error_code) && <Btn disabled={!!busy} onClick={()=>navigate('/settings?section=ai')}>Model Settings</Btn>}{!hideLegacy && <Btn disabled={!!busy} onClick={()=>{ noteLegacy('plan_adjust'); navigate(`/import/${project.id}`) }}>Adjust Plan</Btn>}
        </FailureActions></div>}
      {error && <div className="ac-empty"><b>Failed to load drafts</b>{t(error)}<Btn onClick={refresh}>Retry</Btn></div>}
      <div className="ac-grid-3 studio-result-grid">{automatic ? [...(workspace.output_variants || [])].sort((a, b) => Number(a.status === 'on_demand') - Number(b.status === 'on_demand')).map(variant => <OutputVariantCard key={variant.id} projectId={project.id} variant={variant} draft={variantDraft(variant.draft_id)} job={variantJob(variant.render_job_id)} billable={billable > 0} recommendation={{ recommended_template: workspace.generation?.recommended_template, accepted_recommendation: workspace.generation?.accepted_recommendation }} onRetry={()=>act(`retry-${variant.id}`, async()=>{await studioApi.retryOutputVariant(project.id, variant.id)})} onProduce={()=>act(`produce-${variant.id}`, async()=>{await studioApi.produceOutputVariant(project.id, variant.id, variant.strategy_id)})}/>) : workspace.drafts.map(d => <DraftResultCard key={d.id} projectId={project.id} draft={d} jobs={workspace.jobs}
        onEdit={()=>navigate(`/project/${project.id}/studio/${d.id}`)} allowExport={!hideLegacy} onExport={()=>{ noteLegacy('export_confirm'); setExporting(d) }} onHistory={()=>setHistory(true)} />)}{loaded && !automatic && children}</div>
      {!loading&&!error&&!workspace.drafts.length&&!project.clips?.length&&!project.collections?.length&&workspace.analysis?.status!=='running'&&!sourceUnusable&&!cookieRecovery&&<div className="ac-empty"><b>No clips available yet</b>{managed?'You can retry or adjust the production plan.':'You can adjust the minimum score and retry.'}</div>}
    </Section>}
    {actionError&&<p className="studio-error" role="alert">{actionError}</p>}
    <details className="studio-params-card" open={workspace.analysis?.status === 'running' || !workspace.drafts.length}>
      <summary className="studio-params-summary">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="16" y2="12" />
            <line x1="12" x2="12.01" y1="8" y2="8" strokeWidth="2.5" />
          </svg>
          Task Details & Parameters
        </span>
        <span className="studio-muted" style={{ fontSize: '12px', fontWeight: 'normal' }}>
          {workspace.analysis?.status === 'running' ? 'In Progress' : 'View Details'}
        </span>
      </summary>
      <div className="studio-params-body">
        <div className="studio-params-grid">
          {((workspace as any).source_meta?.title || project.name) && (
            <div className="studio-param-item">
              <span className="studio-param-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" />
                </svg>
                Video Title
              </span>
              <span className="studio-param-value">{(workspace as any).source_meta?.title || project.name}</span>
            </div>
          )}
          {formatSegmentText(workspace, project, t) && (
            <div className="studio-param-item">
              <span className="studio-param-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Crop Range
              </span>
              <span className="studio-param-value ac-mono" style={{ color: 'var(--ac-accent)' }}>
                {formatSegmentText(workspace, project, t)}
              </span>
            </div>
          )}
          {getMaxClipsText(workspace, project, t) && (
            <div className="studio-param-item">
              <span className="studio-param-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
                Target Clips
              </span>
              <span className="studio-param-value">{getMaxClipsText(workspace, project, t)}</span>
            </div>
          )}
          {getQualityText(workspace, project, t) && (
            <div className="studio-param-item">
              <span className="studio-param-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Processing Quality
              </span>
              <span className="studio-param-value">{getQualityText(workspace, project, t)}</span>
            </div>
          )}
          {project.source_url && (
            <div className="studio-param-item" style={{ gridColumn: '1 / -1' }}>
              <span className="studio-param-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Source Video
              </span>
              <span className="studio-param-value">
                <a href={project.source_url} target="_blank" rel="noopener noreferrer" className="studio-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {project.source_url}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    </details>
    <details className="studio-details studio-source-details"><summary>{visual ? "Highlight Clips" : "Source Media"} <span className="ac-mono">{workspace.events.length+(project.clips?.length||0)}</span> · Select when replacing scenes</summary>
      {workspace.analysis?.coverage && <p className="studio-muted">{workspace.analysis.coverage.note} {`Initial sampling interval ~${workspace.analysis.coverage.sample_interval.toFixed(1)}s.`}</p>}
      {workspace.events.map(e=><div className="studio-source-row" key={e.id}><div><b>{e.label}</b><p className="studio-muted">{`${e.start.toFixed(1)}–${e.end.toFixed(1)}s · ${e.evidence}`}</p></div><div className="studio-actions"><Btn size="sm" onClick={()=>setPreview(e)}>Preview Source</Btn><Btn size="sm" disabled={!!busy} loading={busy===e.id} onClick={()=>act(e.id,async()=>{const d=await studioApi.eventDraft(project.id,e.id);navigate(`/project/${project.id}/studio/${d.id}`)})}>Use in New Clip</Btn></div></div>)}
      {project.clips?.map(c=><div className="studio-source-row" key={c.id}><div><b>{c.generated_title||c.title}</b><p className="studio-muted">{c.start_time}–{c.end_time}</p></div><Btn size="sm" disabled={!!busy} loading={busy===c.id} onClick={()=>createLegacy(c)}>Use in New Clip</Btn></div>)}
    </details>
    <details className="studio-details studio-source-details"><summary>Source Media</summary><video controls preload="none" className="studio-source-video" src={studioApi.source(project.id)}/></details>
    <ExportHistory projectId={project.id} jobs={workspace.jobs} open={history} onClose={()=>setHistory(false)}/>
    <Dialog open={!!preview} title={preview?.label||"Source Preview"} onClose={()=>setPreview(null)}>{preview&&<video key={preview.id} controls preload="metadata" className="studio-source-video" src={`${studioApi.source(project.id)}#t=${preview.start},${preview.end}`}/>}<p className="studio-muted">{preview?.evidence}</p></Dialog>
    <Dialog open={!!exporting} title="Export Video" onClose={()=>!busy&&setExporting(null)} description="Render video with current draft settings. Download from Export History when done." footer={<div className="studio-actions"><Btn disabled={!!busy} onClick={()=>setExporting(null)}>Close</Btn><Btn variant="cta" disabled={!!busy} loading={busy==='export'} onClick={()=>exporting&&act('export',async()=>{await studioApi.export(project.id,exporting.id,exporting.revision, exporting);setExporting(null);setHistory(true)})}>Confirm Export</Btn></div>}><p>{exporting?.title}</p><p className="studio-muted">{exporting?.aspect==='portrait'?'9:16 Portrait':exporting?.aspect==='landscape'?'16:9 Landscape':'Original Aspect'} · MP4 · 30 fps</p>{actionError&&<p className="studio-error">{actionError}</p>}</Dialog>
  </div>
}
