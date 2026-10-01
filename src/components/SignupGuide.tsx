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

/** "Blog guide" opens the site's blog until the admin sets a guide link. */
const FALLBACK_GUIDE_URL = '/blog';

/**
 * "Need help signing up?" block shown below the Create Account button.
 * Links come from admin Settings > Sign-up Guide Links. YouTube videos play in an in-page player.
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
      .catch(() => {/* fall back to the blog page; video shows as coming soon */});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') setPlaying(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  const guideUrl = blogUrl || FALLBACK_GUIDE_URL;
  const embed = videoUrl ? youtubeEmbedUrl(videoUrl) : null;

  const videoContent = (
    <>
      <span className="signup-help-icon video"><i className="fas fa-play"></i></span>
      <span className="signup-help-text">
        <strong>Video tutorial</strong>
        <small>{videoUrl ? 'Watch how to sign up' : 'Coming soon'}</small>
      </span>
    </>
  );

  return (
    <>
      <div className="signup-help" role="region" aria-label="Help with signing up">
        <div className="signup-help-divider"><span>Need help signing up?</span></div>
        <div className="signup-help-options">
          <a className="signup-help-option" href={guideUrl} target="_blank" rel="noopener noreferrer">
            <span className="signup-help-icon blog"><i className="fas fa-book-open"></i></span>
            <span className="signup-help-text">
              <strong>Blog guide</strong>
              <small>Step-by-step article</small>
            </span>
            <i className="fas fa-arrow-right signup-help-arrow"></i>
          </a>

          {!videoUrl ? (
            <div className="signup-help-option is-disabled" aria-disabled="true" title="The video tutorial will be added soon">
              {videoContent}
            </div>
          ) : embed ? (
            <button type="button" className="signup-help-option" onClick={() => setPlaying(true)}>
              {videoContent}
              <i className="fas fa-arrow-right signup-help-arrow"></i>
            </button>
          ) : (
            <a className="signup-help-option" href={videoUrl} target="_blank" rel="noopener noreferrer">
              {videoContent}
              <i className="fas fa-arrow-right signup-help-arrow"></i>
            </a>
          )}
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
