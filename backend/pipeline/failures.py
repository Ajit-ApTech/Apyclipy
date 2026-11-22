"""
流水线「明确失败」异常。

原则：LLM 不可用、字幕缺失、大纲 / 评分为空、切片没产出文件——这些都必须让项目进 failed 态，
带上阶段和一句用户能照着做的提示；不能吞掉后继续跑成 `Completed · 0 切片`（#100 #11 #24 的共同表象）。
"""

from __future__ import annotations


class PipelineFailure(RuntimeError):
    """带阶段与用户提示的流水线失败。

    stage: 与 simple_progress 的阶段名一致（INGEST / SUBTITLE / ANALYZE / HIGHLIGHT / EXPORT），
           前端失败态与应用内反馈会带上它。
    hint:  用户下一步能做什么（去哪个设置项、装什么），追加在错误正文后面。
    """

    def __init__(
        self,
        stage: str,
        message: str,
        hint: str = "",
        code: str = "",
        http_status: int | None = None,
        upstream_error_type: str = "",
    ):
        super().__init__(message)
        self.stage = stage
        self.hint = hint
        # 上游 HTTP 状态码（仅 400–599 的整数）；没有链上原始异常时（如时间线汇总失败）用它带出状态码。
        self.http_status = http_status
        # 稳定机器码。前端用来打开对应设置页，或避免打开错误的设置页。
        # llm_not_configured：没有可用提供商 / 缺少 API Key
        # llm_auth_invalid：上游拒绝密钥或权限（401/403）
        # whisper_not_installed | whisper_install_failed | transcription_empty | subtitle_setup
        # timeline_empty：有效候选被时长筛选清空（不要再指到「设置 → 服务商与模型」）
        # source_too_short | source_no_audio：源视频本身不能走字幕路线（media_precheck），用户输入，不上报
        self.code = code
        # Fine-grained upstream kind (insufficient_quota / invalid_key / …). Not a studio
        # error_code — keep analytics on the coarse `code` until the #9 contract expands.
        self.upstream_error_type = upstream_error_type

    @property
    def message(self) -> str:
        return str(self.args[0]) if self.args else ""

    def user_message(self) -> str:
        return f"{self.message} {self.hint}".strip()


HINT_CHECK_LLM = "请到「设置 → 服务商与模型」检查提供商、API Key 与模型名，点「测试连接」确认后重试。"
# 缺密钥 / 提供商不可用 / 连接测试失败：明确要自备 key，并指到设置里的「模型」。
HINT_BRING_OWN_KEY = (
    "需要自备 API Key（本机 Ollama / LM Studio 则先启动服务）。"
    "到「设置 → 服务商与模型」填写提供商、密钥和模型名，点「测试连接」后再试。"
    "密钥在该提供商的控制台申请，只保存在这台机器上。"
)
CODE_LLM_NOT_CONFIGURED = "llm_not_configured"
def _model_call_messages() -> dict[str, str]:
    from backend.core.failure_codes import sentence
    return {code: sentence(code) for code in ("llm_auth_invalid", "connection", "timeout", "rate_limited")}
MODEL_CALL_MESSAGES = _model_call_messages()


def looks_like_llm_setup_error(text: str) -> bool:
    """调用模型失败，是因为没有可用密钥 / 连接测试没通过，而不是内容本身。"""
    raw = (text or "").lower()
    needles = (
        "没有可用的 llm",
        "缺少 api key",
        "未配置llm",
        "未配置 api",
        "api key为空",
        "api key 为空",
        "invalid api key",
        "incorrect api key",
        "api连接测试失败",
        "连接测试失败",
        "authentication",
        "unauthorized",
        "missing api key",
        "no api key",
    )
    return any(n in raw for n in needles)


def llm_key_failure(stage: str, message: str) -> PipelineFailure:
    return PipelineFailure(stage, message, HINT_BRING_OWN_KEY, code=CODE_LLM_NOT_CONFIGURED)


HINT_SUBTITLE = "到「设置 → 默认模型 → 语音转字幕」安装 Whisper 模型让 AutoClip 自动转写，或导入 .srt 字幕后重试。"
HINT_LOWER_THRESHOLD = "到「设置 → 服务商与模型 → 最低评分阈值」调低后重试，或换一个更强的模型。"
HINT_CHECK_FFMPEG = "确认 ffmpeg 可用（桌面版内置；Docker / 脚本模式请检查 PATH），以及原视频文件完整可播放。"
# Legacy fallback when a caller returns [] without Step 2 diagnostics.
# The extractor itself distinguishes request, response and duration failures.
CODE_TIMELINE_EMPTY = "timeline_empty"
HINT_EMPTY_TIMELINE = (
    "Short segments are often filtered out by the minimum duration threshold (approx 20s), or timestamps do not align with subtitles. "
    "Try using material with more continuous speech or voiceover."
)


def empty_timeline_failure(topic_count: int) -> PipelineFailure:
    """旧调用方只返回空列表时的兜底。正常 Step 2 使用本轮报告分类。"""
    return PipelineFailure(
        "ANALYZE",
        f"Timeline extraction was empty: {topic_count} topic(s) had no valid clips remaining after duration filtering.",
        HINT_EMPTY_TIMELINE,
        code=CODE_TIMELINE_EMPTY,
    )


def model_call_error_code(error: Exception) -> str:
    """Coarse studio code only. Fine type lives on ClassifiedUpstreamError / PipelineFailure.upstream_error_type."""
    from backend.core.failure_attribution import frozen_error_code
    from backend.core.llm_retry import studio_code_for
    from backend.core.upstream_errors import classify_exception, http_error_parts

    frozen = frozen_error_code(error)  # the redaction boundary already decided it
    if frozen:
        return frozen
    info = classify_exception(error)
    status, _body = http_error_parts(error)
    code = studio_code_for(info.error_type, status)
    if code == "provider_error" and looks_like_llm_setup_error(str(error)):
        return "authentication"
    return code


def http_status_of(error: BaseException | None) -> int | None:
    """第一个 400–599 的整数 HTTP 状态码，不读正文、URL 或密钥。

    （ ，和 同一套遍历规则）：只有 failure_attribution.http_status_of 一处实现。
    只走显式 __cause__；脱敏边界冻结在安全异常上的 http_status 优先；不再走 __context__
    （处理旧 503 时又发生的新错误，不能把旧状态码带进新请求）。
    """
    from backend.core.failure_attribution import http_status_of as _one_rule
    return _one_rule(error)


def timeline_failure_from_report(topic_count: int, report: dict) -> PipelineFailure:
    """Use current-run observations, not a guess that an empty timeline is short."""
    chunks = report.get("chunks", [])
    if report.get("parsed", 0):
        minimum = report.get("minimum_seconds")
        if minimum is not None:
            return PipelineFailure(
                "ANALYZE",
                f"Timeline extraction was empty: {report['parsed']} valid candidate(s) did not reach the minimum duration ({minimum:g}s) after subtitle boundary alignment.",
                "Adjacent clips remained shorter than the minimum duration. Please use footage or audio with continuous speech that forms complete topics; lowering the scoring threshold will not change duration limits.",
                code=CODE_TIMELINE_EMPTY,
            )
        return empty_timeline_failure(topic_count)
    failed_calls = [chunk for chunk in chunks if chunk.get("outcome") == "call_failed"]
    if failed_calls:
        from backend.core.upstream_errors import hint_key_for

        last = failed_calls[-1]
        code = last["error_code"]
        kind = last.get("upstream_error_type") or ""
        hints = {
            "authentication": "Please check your API key, model permissions, and provider configuration in Settings → Providers & Models, then test connection.",
            "rate_limited": MODEL_CALL_MESSAGES.get("rate_limited", "Rate limited by provider."),
            "timeout": MODEL_CALL_MESSAGES.get("timeout", "Model request timed out."),
            "connection": MODEL_CALL_MESSAGES.get("connection", "Connection failed."),
            "provider_error": "Provider failed to complete the timeline request. Please check model availability and try again.",
        }
        classified = hint_key_for(kind) if kind else hints.get(code, hints["provider_error"])
        return PipelineFailure(
            "ANALYZE", f"Timeline model request failed: {len(failed_calls)}/{len(chunks)} subtitle chunk(s) failed. No candidates available for this run.",
            classified + " A successful test connection or outline does not guarantee that subsequent long-context requests will succeed.", code=code,
            http_status=last.get("http_status"), upstream_error_type=kind,
        )
    if chunks and all(chunk.get("outcome") == "missing_subtitles" for chunk in chunks):
        return PipelineFailure("ANALYZE", "Subtitle chunks required for timeline analysis could not be read.",
                               "Please re-import the video with an SRT subtitle file.", code="missing_resource")
    if any(chunk.get("outcome") == "chunk_error" for chunk in chunks):
        return PipelineFailure("ANALYZE", "Timeline chunk processing failed, no valid candidates available.",
                               "Please check that project directories are writable.", code="unexpected")
    if chunks:
        rejected = {}
        for chunk in chunks:
            for reason, count in chunk.get("rejected", {}).items():
                rejected[reason] = rejected.get(reason, 0) + count
        invalid_ranges = rejected.get("invalid_time", 0) + rejected.get("outside_chunk_or_reversed", 0)
        detail = (f" {invalid_ranges} candidate(s) had invalid timestamps or were outside the subtitle chunk." if invalid_ranges else "")
        from backend.core.weak_local_timeline import WEAK_LOCAL_TIMELINE_REASON, empty_interval_hint

        cached = any(isinstance(chunk, dict) and chunk.get("source") == "cache" for chunk in chunks)
        if report.get("weak_local_timeline") and not cached:
            return PipelineFailure("ANALYZE", WEAK_LOCAL_TIMELINE_REASON, "", code="invalid_response")
        return PipelineFailure(
            "ANALYZE", f"Timeline model returned no valid time intervals ({topic_count} topics, {len(chunks)} subtitle chunks).{detail}",
            empty_interval_hint(report, chunks) + " This step has not entered scoring or duration filtering yet.", code="invalid_response",
        )
    return empty_timeline_failure(topic_count)


from backend.core.failure_attribution import AttributedError  # noqa: E402 - no cycle


class AttributedPipelineFailure(AttributedError, PipelineFailure):
    """a PipelineFailure carrying the snapshot built where the chain was intact (``.attribution``)."""


def cloud_transcription_failure(message, error: BaseException | None = None, http_status: int | None = None,
                                upstream_error_type: str = "") -> PipelineFailure:
    """CloudTranscriptionError carries only our safe public text, never a provider body."""
    from backend.core.failure_attribution import attributed, frozen_error_code
    if not isinstance(message, str):
        error = error or message
        message = str(message)
    if error is not None:
        http_status = http_status or getattr(error, "http_status", None)
        upstream_error_type = upstream_error_type or getattr(error, "upstream_error_type", "") or ""
    if upstream_error_type == "unknown":
        upstream_error_type = ""
    code = frozen_error_code(error) or "provider_error"
    failure = AttributedPipelineFailure(
        "SUBTITLE", f"Cloud transcription failed: {message}",
        "Go to Settings → Default Models → Voice to Subtitles to check your cloud transcription provider, API key, and model, or import an SRT subtitle file.",
        code=code, http_status=http_status if isinstance(http_status, int) else None,
        upstream_error_type=upstream_error_type,
    )
    return attributed(failure, getattr(error, "attribution", None), http_status=http_status,
                      error_code=code if code != "provider_error" else frozen_error_code(error))


def transcription_not_ready_failure(check: dict, stage: str = "SUBTITLE") -> PipelineFailure:
    """ASR is not ready: same codes the frontend import gate already uses, before any paid call."""
    code = (check or {}).get("code") or "whisper_not_installed"
    if code in {"whisper_install_failed", "whisper_model_failed"}:
        return PipelineFailure(
            stage,
            "No subtitles available for analysis: Video has no subtitles and previous Whisper installation was unsuccessful.",
            "Go to Settings → Default Models → Voice to Subtitles to retry installation, or attach an .srt subtitle file.",
            code="whisper_install_failed",
        )
    if code == "sensevoice_not_ready":
        return PipelineFailure(
            stage,
            "No subtitles available for analysis: SenseVoice produced no usable subtitles.",
            "Go to Settings → Default Models → Voice to Subtitles to check SenseVoice status, or attach an .srt subtitle file.",
            code="subtitle_setup",
        )
    if code == "cloud_not_configured":
        return PipelineFailure(
            stage,
            "Cloud transcription failed: No usable transcription result obtained.",
            "Go to Settings → Default Models → Voice to Subtitles to check settings, or attach an .srt subtitle file.",
            code="provider_error",
        )
    return PipelineFailure(
        stage,
        "No subtitles available for analysis: Video has no subtitles and local Whisper is not installed.",
        "Go to Settings → Default Models → Voice to Subtitles to install Whisper, or attach an .srt subtitle file.",
        code="whisper_not_installed",
    )


def missing_subtitle_failure() -> PipelineFailure:
    """Video has no subtitles and auto-transcription left no SRT."""
    from backend.services import whisper_runtime
    from backend.services.ai_model_settings import load
    settings = load()
    if settings and settings.transcription and settings.transcription.provider == 'cloud':
        return cloud_transcription_failure("No usable transcription result obtained.")
    if settings and settings.transcription and settings.transcription.provider == 'sensevoice_local':
        return PipelineFailure('SUBTITLE', 'No subtitles available for analysis: SenseVoice produced no usable subtitles.',
                               'Go to Settings → Default Models → Voice to Subtitles to check SenseVoice, or attach an .srt subtitle file.',
                               code='subtitle_setup')

    status = whisper_runtime.get_status()
    state = status.get("status")
    if state == "error":
        return PipelineFailure(
            "SUBTITLE",
            "No subtitles available for analysis: Video has no subtitles and previous Whisper installation was unsuccessful.",
            "Go to Settings → Default Models → Voice to Subtitles to retry installation, or attach an .srt subtitle file.",
            code="whisper_install_failed",
        )
    if state != "installed":
        return PipelineFailure(
            "SUBTITLE",
            "No subtitles available for analysis: Video has no subtitles and local Whisper is not installed.",
            "Go to Settings → Default Models → Voice to Subtitles to install Whisper, or attach an .srt subtitle file.",
            code="whisper_not_installed",
        )
    return PipelineFailure(
        "SUBTITLE",
        "No subtitles available for analysis: Video has no subtitles, Whisper is installed, but transcription produced no captions.",
        "Confirm the video has clear speech and try again, or attach an .srt subtitle file.",
        code="transcription_empty",
    )


def failure_from_speech_error(message: str) -> PipelineFailure:
    """Turn speech recognition exception into standard pipeline failure."""
    text = (message or "").strip().replace("设置 → 语音识别", "Settings → Default Models → Voice to Subtitles").replace("设置 → 转写", "Settings → Default Models → Voice to Subtitles")
    from backend.pipeline import media_precheck

    if media_precheck.is_no_audio_text(text):
        return media_precheck.no_audio_failure("SUBTITLE")
    if "已超过时间上限" in text or "exceeded time limit" in text.lower():
        return PipelineFailure("SUBTITLE", text, code="timeout")
    if 'SenseVoice' in text:
        return PipelineFailure('SUBTITLE', text,
                               '' if 'Settings → Default Models → Voice to Subtitles' in text else 'Go to Settings → Default Models → Voice to Subtitles to check SenseVoice, or attach an SRT subtitle file.',
                               code='subtitle_setup')
    from backend.services import whisper_runtime

    state = whisper_runtime.get_status().get("status")
    not_installed = ("未安装" in text) or ("没有可用的语音识别" in text) or ("not installed" in text.lower())
    if not_installed:
        if state == "error":
            return missing_subtitle_failure()
        return PipelineFailure(
            "SUBTITLE",
            "No subtitles available for analysis: Video has no subtitles and local Whisper is not installed.",
            "Go to Settings → Default Models → Voice to Subtitles to install Whisper, or attach an SRT subtitle file.",
            code="whisper_not_installed",
        )
    if any(token in text for token in ("未识别出任何语音", "没有从这段视频", "可用语音", "no speech detected", "no usable speech")):
        return PipelineFailure(
            "SUBTITLE",
            "No subtitles available for analysis: Video has no subtitles, Whisper is installed, but transcription produced no captions.",
            "Confirm the video has clear speech and try again, or attach an SRT subtitle file.",
            code="transcription_empty",
        )
    hint = "" if "Settings → Default Models → Voice to Subtitles" in text else HINT_SUBTITLE
    return PipelineFailure("SUBTITLE", text, hint, code="subtitle_setup")
