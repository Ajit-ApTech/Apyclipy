import { t } from '../i18n'
import { useTranslation } from 'react-i18next'
import React from 'react'
import LanguageSelect from './LanguageSelect'
import { Layout, Button } from 'antd'
import { SettingOutlined, BulbOutlined, MoonOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { UpdateToast, useAppUpdate } from '../desktop/UpdatePrompt'
import { Icon } from '../ui'
import { useKeepAwakeHeld } from '../features/studio/KeepAwakeGuard'

const { Header: AntHeader } = Layout

// Calm Premium header — see DESIGN.md
const Header: React.FC = () => {
  useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isSettings = location.pathname === '/settings'
  const { theme, toggleTheme } = useTheme()
  const appUpdate = useAppUpdate()
  const updatePending = appUpdate.phase === 'downloading' || appUpdate.phase === 'ready' || appUpdate.phase === 'failed' || appUpdate.phase === 'restarting'
  const keepAwakeHeld = useKeepAwakeHeld()

  return (
    <AntHeader
      style={{
        padding: '0 clamp(16px, 4vw, 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        lineHeight: 'normal',
        overflow: 'visible',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'color-mix(in srgb, var(--ac-bg) 82%, transparent)',
        borderBottom: '1px solid var(--ac-line)',
        transition: 'background var(--ac-t-smooth) ease, border-color var(--ac-t-smooth) ease',
      }}
    >
      {/* Wordmark — Apyclipy */}
      <div
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'opacity var(--ac-t-micro) ease' }}
        onClick={() => navigate('/')}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <span
          style={{
            fontFamily: 'var(--ac-font-sans)',
            fontWeight: 700,
            fontSize: '23px',
            color: 'var(--ac-ink)',
            letterSpacing: '-0.03em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <span style={{ color: 'var(--ac-accent)', marginRight: '3px', fontSize: '18px' }}>✦</span>
          Apy<span style={{ color: 'var(--ac-accent)' }}>clipy</span>
        </span>
      </div>

      {/* Right side */}
      <div className="ac-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {keepAwakeHeld && (
          <span
            className="ac-keep-awake-pill"
            title={t('制作中，已阻止休眠')}
            aria-label={t('制作中，已阻止休眠')}
            style={{
              fontSize: '12px',
              color: 'var(--ac-sub)',
              border: '1px solid var(--ac-line)',
              borderRadius: '999px',
              padding: '4px 12px',
              background: 'var(--ac-card)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              maxWidth: '42vw',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxShadow: 'var(--ac-shadow-sm)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ac-ok)', display: 'inline-block' }} />
            {t('制作中，已阻止休眠')}
          </span>
        )}
        {updatePending && (
          <div className="ac-update-anchor">
            <button
              type="button"
              className="ac-update-icon"
              aria-expanded={appUpdate.toastVisible}
              aria-label={t('有新版本可用')}
              onClick={() => appUpdate.toastVisible ? appUpdate.snooze() : appUpdate.openUpdate()}
            >
              <Icon.Up size={16} />
            </button>
            <UpdateToast />
          </div>
        )}
        <div className="ac-header-permanent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LanguageSelect />
        <Button
          type="text"
          icon={theme === 'dark' ? <BulbOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? t("切换到亮色模式") : t("切换到暗色模式")}
          title={theme === 'dark' ? t("切换到亮色模式") : t("切换到暗色模式")}
          style={{
            color: 'var(--ac-sub)',
            border: '1px solid var(--ac-line)',
            borderRadius: '999px',
            width: '36px',
            height: '36px',
            padding: 0,
            background: 'var(--ac-card)',
            boxShadow: 'var(--ac-shadow-sm)',
            transition: 'all var(--ac-t-micro) ease',
          }}
        />
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={() => navigate('/settings')}
          aria-current={isSettings ? 'page' : undefined}
          style={{
            color: isSettings ? 'var(--ac-ink)' : 'var(--ac-sub)',
            border: '1px solid var(--ac-line)',
            borderRadius: '999px',
            height: '36px',
            padding: '0 16px',
            background: isSettings ? 'var(--ac-line-2)' : 'var(--ac-card)',
            fontWeight: 500,
            boxShadow: 'var(--ac-shadow-sm)',
            transition: 'all var(--ac-t-micro) ease',
          }}
        >{t("设置")}</Button>
        </div>
      </div>
    </AntHeader>
  )
}

export default Header
