import React, { useEffect, useRef } from 'react';
import { BASE_URL } from '../services/api';

const UniversalVideoPlayer = ({ url, className, onEnded, autoPlay = true, controls = true, playing = true }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        // Sync HTML5 video play/pause
        if (videoRef.current && !url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('vimeo.com')) {
            if (playing) {
                videoRef.current.play().catch(err => console.log("Play failed", err));
            } else {
                videoRef.current.pause();
            }
        }
    }, [playing, url]);

    if (!url) return null;

    // Fix relative URLs from server
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;

    // Improved YouTube ID extraction
    const getYouTubeId = (url) => {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?v=)|(\&v=))([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[8].length === 11) ? match[8] : null;
    };

    // Helper to extract Vimeo ID
    const getVimeoId = (url) => {
        const match = url.match(/vimeo\.com\/(\d+)/);
        return match ? match[1] : null;
    };

    const youtubeId = getYouTubeId(url);
    const vimeoId = getVimeoId(url);

    if (youtubeId) {
        return (
            <div className={`w-full bg-black flex items-center justify-center ${className}`} style={{ aspectRatio: '16/9' }}>
                <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${playing ? 1 : 0}&controls=${controls ? 1 : 0}&mute=${autoPlay ? 1 : 0}&enablejsapi=1&origin=${window.location.origin}`}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube video player"
                ></iframe>
            </div>
        );
    }

    if (vimeoId) {
        return (
            <div className={`w-full bg-black flex items-center justify-center ${className}`} style={{ aspectRatio: '16/9' }}>
                <iframe
                    src={`https://player.vimeo.com/video/${vimeoId}?autoplay=${playing ? 1 : 0}`}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Vimeo video player"
                ></iframe>
            </div>
        );
    }

    // Default to HTML5 Video for direct links (.mp4, etc.)
    return (
        <video
            ref={videoRef}
            src={fullUrl}
            className={className}
            controls={controls}
            autoPlay={autoPlay}
            playsInline
            onEnded={onEnded}
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
        />
    );
};

export default UniversalVideoPlayer;
