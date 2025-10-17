---
inclusion: always
---

# Devvit Framework Guidelines

## Core Devvit Concepts

- Apps run in Reddit's sandboxed environment
- Use Devvit's component system for UI (no HTML/CSS)
- State management through Devvit hooks (useState, useAsync)
- Data persistence via built-in Redis integration
- Reddit API access through Devvit's methods

## Essential Devvit Patterns

```typescript
// App registration
Devvit.addCustomPostType({
  name: 'Game Name',
  render: GameComponent
});

// Component structure
const GameComponent = (context) => {
  const [gameState, setGameState] = useState({});

  return (
    <vstack>
      <text>Game UI</text>
      <button onPress={() => {}}>Action</button>
    </vstack>
  );
};
```

## Reddit Integration Best Practices

- Always check user permissions before game actions
- Use subreddit context for game customization
- Implement proper error handling for Reddit API calls
- Follow Reddit's rate limiting guidelines
- Consider moderation and community guidelines

## Performance Considerations

- Minimize Redis operations
- Use efficient state updates
- Optimize for mobile Reddit experience
- Handle network latency gracefully

## Deployment Process

- Use `devvit upload` for app deployment
- Test in development subreddit first
- Follow Devvit app store guidelines
- Document installation instructions for subreddit mods
