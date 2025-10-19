## Color Rush

A high-energy reflex game for Reddit Community Games 2025. Tap the correct colored dots while avoiding bombs and wrong colors!

- [Devvit](https://developers.reddit.com/): A way to build and deploy immersive games on Reddit
- [Vite](https://vite.dev/): For compiling the webView
- [Phaser](https://phaser.io/): 2D game engine
- [Express](https://expressjs.com/): For backend logic
- [Typescript](https://www.typescriptlang.org/): For type safety

## Game Features

- **Fast-paced reflex gameplay**: Tap colored dots matching the target color
- **Dynamic difficulty scaling**: Game gets progressively harder with exponential formulas
- **Strategic slow-motion power-ups**: Limited charges for tactical gameplay
- **Reddit leaderboard integration**: Compete with the community
- **Mobile-optimized**: Designed for Reddit's mobile-first experience
- **Advanced UI system**: Comprehensive error handling and responsive design
- **Cross-platform compatibility**: Works seamlessly across desktop, mobile, and tablet devices

## Getting Started

> Make sure you have Node 20+ downloaded on your machine before running!

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development server
4. Open the provided Reddit playtest URL to test the game

## Technical Architecture

### Advanced UI System
- **ResponsiveLayoutManager**: Dynamic layout calculation with mobile-first design
- **SafeCleanupHelpers**: Production-ready resource management and memory leak prevention
- **UIErrorLogger**: Comprehensive logging system with 5 log levels and debug report generation
- **FallbackRenderer**: Multi-tier rendering system (TEXT → GRAPHICS → MINIMAL → EMERGENCY)
- **UpdateHandler**: Robust UI update system with error isolation and visual feedback
- **UIElementFactory**: Advanced component factory with comprehensive fallback systems
- **UIErrorRecovery**: Automatic error recovery ensuring game playability under any failure

### Error Handling & Recovery
- **4-Tier Fallback System**: Automatic switching between rendering modes until success
- **Comprehensive Error Recovery**: Retry logic with exponential backoff for failed operations
- **Memory Management**: Proper cleanup of resources preventing memory leaks
- **Cross-Platform Compatibility**: Error handling tested across all device types
- **Production Monitoring**: Real-time error tracking and recovery statistics

### Responsive Design
- **Mobile-First Architecture**: Optimized for Reddit's mobile-first user experience
- **Accessibility Compliance**: 44px minimum touch targets and proper ARIA labels
- **Dynamic Font Scaling**: Automatic font size adjustment based on screen dimensions
- **Orientation Support**: Seamless portrait/landscape transitions with layout adaptation
- **Device Pixel Ratio**: High-DPI display support with crisp rendering

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run check`: Type checks, lints, and prettifies your app

## Development Highlights

### Recent Technical Innovations
- **DOM-Based Text Rendering**: Replaced Phaser's problematic text system with robust DOM overlay
- **WOFF2 Font Optimization**: 30-50% faster font loading with progressive enhancement
- **Advanced Collision Physics**: Perfect elastic collision system with realistic bouncing
- **Game Balance Optimization**: Extended 3.5-minute gameplay sessions with balanced difficulty
- **Comprehensive Error Recovery**: Multi-tier fallback systems ensuring game playability

### Performance Optimizations
- **Font Loading**: WOFF2 format with progressive fallback (WOFF2→TTF→System fonts)
- **Memory Management**: Comprehensive resource cleanup preventing memory leaks
- **Responsive Updates**: Throttled resize handling (60fps) with efficient layout calculations
- **Error Isolation**: Component failures don't cascade to other UI elements
- **Cross-Device Compatibility**: Consistent performance across desktop, mobile, and tablet

### Production Readiness
- **Zero Startup Errors**: Robust initialization with comprehensive error handling
- **Automatic Recovery**: Game remains playable even with complete UI system failures
- **Real-Time Monitoring**: Error tracking and recovery statistics for production debugging
- **Accessibility Compliance**: WCAG guidelines with proper ARIA labels and focus management
- **TypeScript Safety**: Full type safety throughout complex error handling architecture

## Cursor Integration

This template comes with a pre-configured cursor environment. To get started, [download cursor](https://www.cursor.com/downloads) and enable the `devvit-mcp` when prompted.

## Credits

Thanks to the Phaser team for [providing a great template](https://github.com/phaserjs/template-vite-ts)!
