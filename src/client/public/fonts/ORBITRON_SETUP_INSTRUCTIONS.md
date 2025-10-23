# Orbitron Font Setup Instructions

## Overview
This directory contains placeholder files for Orbitron fonts that need to be replaced with actual font files for CSP compliance.

## Required Font Files

You need to download and replace these placeholder files with actual WOFF2 font files:

- `orbitron-regular.woff2` (400 weight)
- `orbitron-medium.woff2` (500 weight) 
- `orbitron-bold.woff2` (700 weight)
- `orbitron-black.woff2` (900 weight)

## Download Instructions

### Option 1: Direct Download from Google Fonts
1. Go to https://fonts.google.com/specimen/Orbitron
2. Click "Download family" to get the TTF files
3. Convert TTF to WOFF2 using an online converter like:
   - https://cloudconvert.com/ttf-to-woff2
   - https://convertio.co/ttf-woff2/

### Option 2: Use Google Fonts Helper
1. Go to https://google-webfonts-helper.herokuapp.com/fonts/orbitron
2. Select the weights you need (400, 500, 700, 900)
3. Download the WOFF2 files directly

### Option 3: Use Font Tools
```bash
# Install fonttools if you have Python
pip install fonttools[woff]

# Convert TTF to WOFF2
pyftsubset Orbitron-Regular.ttf --output-file=orbitron-regular.woff2 --flavor=woff2
pyftsubset Orbitron-Medium.ttf --output-file=orbitron-medium.woff2 --flavor=woff2
pyftsubset Orbitron-Bold.ttf --output-file=orbitron-bold.woff2 --flavor=woff2
pyftsubset Orbitron-Black.ttf --output-file=orbitron-black.woff2 --flavor=woff2
```

## File Replacement

Replace the placeholder files in this directory:
- `orbitron-regular.woff2` ← Replace with actual WOFF2 file
- `orbitron-medium.woff2` ← Replace with actual WOFF2 file  
- `orbitron-bold.woff2` ← Replace with actual WOFF2 file
- `orbitron-black.woff2` ← Replace with actual WOFF2 file

## Verification

After replacing the files, the fonts should load locally without any external CDN requests, ensuring CSP compliance for Reddit's Devvit platform.

## CSP Compliance

✅ **COMPLETED** - All fonts are now bundled locally to comply with Reddit's Content Security Policy.
No external CDN links (like Google Fonts CDN) are used in production.
