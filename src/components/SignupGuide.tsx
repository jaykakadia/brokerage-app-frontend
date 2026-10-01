import { useEffect, useState } from 'react';
import { getSignupGuide } from '../services/api';

// Admin-provided links are rendered as hrefs, so only plain web links are allowed.
const safeUrl = (url?: string | null): string => {
  const value = (url || '').trim();
  return /^https?:\/\//i.test(value) ? value : '';
};

/** YouTube embed URL for watch / youtu.be / shorts / live / embed links, or null for anything else. */
const youtubeEmbedUrl = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/i);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0` : null;
};

/**
 * "How to sign up" tutorial links set by the admin (Settings > Sign-up Guide Links).
 * Renders nothing until the admin adds at least one link.
 */
export default function SignupGuide() {
  const [blogUrl, setBlogUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSignupGuide()
      .then((res) => {
        if (cancelled || !res.data?.data) return;
        setBlogUrl(safeUrl(res.data.data.blog_url));
        setVideoUrl(safeUrl(res.data.data.video_url));
      })
      .catch(() => {/* no guide configured -> show nothing */});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setPlaying(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  if (!blogUrl && !videoUrl) return null;

  const embed = videoUrl ? youtubeEmbedUrl(videoUrl) : null;

  return (
    <>
      <div className="signup-guide">
        <div className="signup-guide-text">
          <i className="fas fa-circle-question"></i>
          <div>
            <strong>New to TradeCall?</strong>
            <span>See how to create your account step by step.</span>
          </div>
        </div>
        <div className="signup-guide-actions">
          {videoUrl ? (
            embed ? (
              <button type="button" className="signup-guide-btn video" onClick={() => setPlaying(true)}>
                <i className="fab fa-youtube"></i> Watch Video
              </button>
            ) : (
              <a className="signup-guide-btn video" href={videoUrl} target="_blank" rel="noopener noreferrer">
                <i className="fas fa-play-circle"></i> Watch Video
              </a>
            )
          ) : null}
          {blogUrl ? (
            <a className="signup-guide-btn blog" href={blogUrl} target="_blank" rel="noopener noreferrer">
              <i className="fas fa-book-open"></i> Read Guide
            </a>
          ) : null}
        </div>
      </div>

      {playing && embed ? (
        <div className="signup-video-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPlaying(false); }}>
          <div className="signup-video-box" role="dialog" aria-label="Sign-up tutorial video">
            <button type="button" className="signup-video-close" onClick={() => setPlaying(false)} aria-label="Close video">
              <i className="fas fa-times"></i>
            </button>
            <div className="signup-video-frame">
              <iframe
                src={embed}
                title="How to create your TradeCall account"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
