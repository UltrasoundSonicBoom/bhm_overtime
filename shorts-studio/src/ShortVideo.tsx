import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type ShortClip = {
  id: string;
  order: number;
  fileName: string;
  category: string;
  categoryShort: string;
  categoryColor: string;
  categorySoft: string;
  hookDraft: string;
  hookTitle: string;
  insight: string;
  corePoint: string;
  visualLayout: string;
  sourceType: 'news' | 'paper';
  sourceName: string;
  sourceTitle: string;
  sourceUrl: string;
  publishedAt: string;
  durationSec: number;
  renderTemplate: string;
};

const container: React.CSSProperties = {
  backgroundColor: '#f7f6f1',
  color: '#101218',
  fontFamily: 'Inter, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  padding: 72,
  position: 'relative',
  overflow: 'hidden',
};

const brandMark: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 14,
  height: 64,
  padding: '0 20px 0 12px',
  borderRadius: 999,
  border: '3px solid #101218',
  backgroundColor: 'rgba(255,255,255,0.86)',
  boxShadow: '8px 8px 0 #101218',
};

const labelPill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 48,
  padding: '0 18px',
  borderRadius: 999,
  border: '3px solid #101218',
  backgroundColor: '#101218',
  color: '#fcfbf7',
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: 0,
};

const infoBand: React.CSSProperties = {
  position: 'absolute',
  left: 72,
  right: 72,
  bottom: 72,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  alignItems: 'center',
  padding: '22px 26px',
  borderRadius: 32,
  border: '3px solid #101218',
  backgroundColor: 'rgba(255,255,255,0.9)',
  boxShadow: '10px 10px 0 #101218',
};

export const ShortVideo: React.FC<{clip: ShortClip}> = ({clip}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: {
      damping: 14,
      mass: 0.9,
      stiffness: 110,
    },
  });

  const fade = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const topTranslate = interpolate(enter, [0, 1], [36, 0]);
  const middleTranslate = interpolate(enter, [0, 1], [64, 0]);
  const progress = interpolate(frame, [0, 270], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={container}>
      <AbsoluteFill
        style={{
          backgroundColor: clip.categorySoft,
          clipPath: 'polygon(0 0, 100% 0, 100% 32%, 0 46%)',
        }}
      />
      <AbsoluteFill
        style={{
          left: 0,
          right: '78%',
          backgroundColor: clip.categoryColor,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 72,
          left: 72,
          right: 72,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 20,
          alignItems: 'center',
          opacity: fade,
          transform: `translateY(${topTranslate}px)`,
        }}
      >
        <div style={brandMark}>
          <Img
            src={new URL('../../snuhmaterect.png', import.meta.url).href}
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              border: '3px solid #101218',
              backgroundColor: '#ffffff',
            }}
          />
          <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
            <span style={{fontSize: 22, fontWeight: 900, lineHeight: 1.2}}>SNUH 메이트</span>
            <span style={{fontSize: 18, color: '#55606f', fontWeight: 700, lineHeight: 1.3}}>48시간 카드브리프</span>
          </div>
        </div>
        <span style={labelPill}>{clip.categoryShort}</span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          top: 250,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          opacity: fade,
          transform: `translateY(${middleTranslate}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 12,
            padding: '14px 20px',
            borderRadius: 999,
            border: '3px solid #101218',
            backgroundColor: 'rgba(255,255,255,0.88)',
            boxShadow: '8px 8px 0 #101218',
            fontSize: 22,
            fontWeight: 900,
          }}
        >
          <span>{String(clip.order).padStart(2, '0')}</span>
          <span>{clip.sourceType === 'paper' ? '논문 하이라이트' : '뉴스 하이라이트'}</span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 84,
            lineHeight: 1.05,
            fontWeight: 900,
            letterSpacing: 0,
            maxWidth: 820,
            wordBreak: 'keep-all',
          }}
        >
          {clip.hookTitle}
        </h1>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            maxWidth: 860,
            padding: '28px 30px',
            borderRadius: 32,
            border: '3px solid #101218',
            backgroundColor: 'rgba(255,255,255,0.88)',
            boxShadow: '10px 10px 0 #101218',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 42,
              lineHeight: 1.35,
              fontWeight: 800,
              wordBreak: 'keep-all',
            }}
          >
            {clip.insight}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.45,
              fontWeight: 700,
              color: '#55606f',
              wordBreak: 'keep-all',
            }}
          >
            {clip.corePoint}
          </p>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            padding: '12px 18px',
            borderRadius: 999,
            border: '3px solid #101218',
            backgroundColor: clip.categoryColor,
            color: '#101218',
            fontSize: 22,
            lineHeight: 1.3,
            fontWeight: 900,
            maxWidth: 860,
          }}
        >
          {clip.visualLayout}
        </div>
      </div>

      <div style={infoBand}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0}}>
          <span style={{fontSize: 22, color: '#55606f', fontWeight: 800}}>출처</span>
          <span style={{fontSize: 28, fontWeight: 900, lineHeight: 1.3, wordBreak: 'keep-all'}}>
            {clip.sourceType === 'paper' ? '논문' : '뉴스'} · {clip.sourceName}
          </span>
          <span style={{fontSize: 22, color: '#55606f', fontWeight: 700, lineHeight: 1.4, wordBreak: 'keep-all'}}>
            {clip.sourceTitle}
          </span>
        </div>
        <div
          style={{
            width: 220,
            height: 18,
            borderRadius: 999,
            border: '3px solid #101218',
            backgroundColor: '#ece6d8',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              backgroundColor: clip.categoryColor,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
