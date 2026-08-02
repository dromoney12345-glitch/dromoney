import React, { useEffect, useRef, useState } from 'react';
import { BASE_URL } from '../services/api';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const getYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const re of patterns) {
        const m = url.match(re);
        if (m?.[1]) return m[1];
    }
    return null;
};

const getVimeoId = (url) => {
    const match = url?.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
};

const UniversalVideoPlayer = ({
    url,
    className = '',
    onEnded,
    autoPlay = true,
    controls = false,
    playing = true,
    muted: mutedProp = false,
}) => {
    const videoRef = useRef(null);
    const [mediaError, setMediaError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    // Many mobile browsers block unmuted autoplay — start muted then try unmute
    const [muted, setMuted] = useState(mutedProp || autoPlay);

    useEffect(() => {
        setMediaError(null);
    }, [url, reloadKey]);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        if (url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com'))) {
            return;
        }

        const tryPlay = async () => {
            try {
                if (playing) {
                    el.muted = muted;
                    const p = el.play();
                    if (p && typeof p.then === 'function') {
                        await p;
                        // After successful play from user gesture, unmute if desired
                        if (!mutedProp && muted) {
                            el.muted = false;
                            setMuted(false);
                        }
                    }
                } else {
                    el.pause();
                }
            } catch (err) {
                // Autoplay with sound blocked — retry muted
                if (!muted) {
                    try {
                        el.muted = true;
                        setMuted(true);
                        await el.play();
                    } catch (err2) {
                        console.warn('Video play failed', err2);
                        setMediaError('Tap play to start the video');
                    }
                } else {
                    console.warn('Video play failed', err);
                    setMediaError('Tap play to start the video');
                }
            }
        };

        tryPlay();
    }, [playing, url, muted, mutedProp, reloadKey]);

    if (!url) return null;

    const fullUrl = url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')
        ? url
        : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;

    const youtubeId = getYouTubeId(url);
    const vimeoId = getVimeoId(url);

    if (mediaError && !youtubeId && !vimeoId) {
        return (
            <div className={`w-full bg-black flex flex-col items-center justify-center gap-3 text-white p-6 ${className}`} style={{ minHeight: 220 }}>
                <AlertTriangle className="text-amber-400" size={28} />
                <p className="text-[12px] text-center text-slate-300">{mediaError}</p>
                <button
                    type="button"
                    onClick={() => {
                        setMediaError(null);
                        setReloadKey((k) => k + 1);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-[11px] font-medium"
                >
                    <RefreshCw size={12} /> Retry
                </button>
            </div>
        );
    }

    if (youtubeId) {
        // Remount iframe when play state changes so autoplay works on more WebViews
        const src = `https://www.youtube.com/embed/${youtubeId}?autoplay=${playing ? 1 : 0}&mute=1&controls=${controls ? 1 : 0}&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
        return (
            <div key={`yt-${youtubeId}-${reloadKey}-${playing ? 1 : 0}`} className={`w-full bg-black flex items-center justify-center ${className}`} style={{ aspectRatio: '16/9' }}>
                <iframe
                    src={src}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    playsInline
                    title="YouTube video player"
                />
            </div>
        );
    }

    if (vimeoId) {
        return (
            <div key={`vm-${vimeoId}-${reloadKey}-${playing ? 1 : 0}`} className={`w-full bg-black flex items-center justify-center ${className}`} style={{ aspectRatio: '16/9' }}>
                <iframe
                    src={`https://player.vimeo.com/video/${vimeoId}?autoplay=${playing ? 1 : 0}&muted=${muted ? 1 : 0}&playsinline=1`}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Vimeo video player"
                />
            </div>
        );
    }

    return (
        <video
            key={`vid-${reloadKey}`}
            ref={videoRef}
            src={fullUrl}
            className={className}
            controls={controls}
            autoPlay={autoPlay && playing}
            muted={muted}
            playsInline
            // Older iOS Safari
            {...{ 'webkit-playsinline': 'true' }}
            preload="auto"
            onEnded={onEnded}
            onError={() => setMediaError('This video cannot play on your device. Try another ad.')}
            onPlaying={() => setMediaError(null)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
        />
    );
};

export default UniversalVideoPlayer;
