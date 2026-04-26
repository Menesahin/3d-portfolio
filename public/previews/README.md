# Project preview thumbnails

Drop WebP screenshots here with the project id as the filename:

    vocabuddy.webp
    shotmock.webp
    claude-voice.webp

**Ideal size**: 640 × 400 (16:10), < 120 KB each.

Until real files exist, `ProjectThumb.tsx` falls back to a procedural
`CanvasTexture` that renders a theme-accent gradient with the project
title baked in. It's ugly-but-consistent; drop real WebPs here to swap.
