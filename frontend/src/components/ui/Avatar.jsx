import { useState } from 'react'

const COLORS = ['#C4A882', '#8C6E52', '#A67C5B', '#7A9E7E', '#9E7A7A', '#7A7A9E', '#9E9A7A', '#6E8C7A']

export default function Avatar({ user, size = 34, onClick, style = {}, className = '' }) {
  const [imgError, setImgError] = useState(false)
  const idx = user?.displayName ? user.displayName.charCodeAt(0) % COLORS.length : 0
  const initials = user?.displayName?.[0]?.toUpperCase() || '?'
  const hasImage = user?.profileImage && !imgError

  if (hasImage) {
    return (
      <img
        src={user.profileImage}
        alt={user.displayName || 'Avatar'}
        onClick={onClick}
        onError={() => setImgError(true)}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1.5px solid rgba(100,80,60,0.15)',
          cursor: onClick ? 'pointer' : 'default',
          flexShrink: 0,
          ...style,
        }}
      />
    )
  }

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: COLORS[idx],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FAF8F5',
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        border: '1.5px solid rgba(100,80,60,0.15)',
        userSelect: 'none',
        ...style,
      }}
    >
      {initials}
    </div>
  )
}
