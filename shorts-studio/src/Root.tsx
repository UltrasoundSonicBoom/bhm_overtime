import {Composition} from 'remotion';
import {ShortVideo, type ShortClip} from './ShortVideo';

const sampleClip: ShortClip = {
  id: 'short-01',
  order: 1,
  fileName: 'clip-01.mp4',
  category: '의료AI',
  categoryShort: '의료AI',
  categoryColor: '#2fbf71',
  categorySoft: '#d9f6e4',
  hookDraft: '의료AI 흐름에서 놓치면 안 될 포인트',
  hookTitle: '도입 속도, 지금은 의료AI입니다',
  insight: '최근 48시간 안에 공개된 기사와 논문을 묶어 도입 흐름과 근거를 한 번에 읽게 합니다.',
  corePoint: '기사와 공개 초록을 함께 보면 실제 적용 속도가 더 잘 보입니다.',
  visualLayout: '상단 후킹 제목 · 중앙 핵심 2줄 · 하단 뉴스 또는 논문 출처',
  sourceType: 'news',
  sourceName: 'Google 뉴스',
  sourceTitle: '최근 의료AI 도입 사례',
  sourceUrl: 'https://example.com',
  publishedAt: new Date().toISOString(),
  durationSec: 10,
  renderTemplate: 'hook-top / insight-center / source-bottom'
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="SnuhCardShort"
      component={ShortVideo}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{clip: sampleClip}}
    />
  );
};
