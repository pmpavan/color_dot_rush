---
inclusion: always
---

# Reddit Devvit Game Development Standards

## Project Context

This is a Reddit Devvit game application. All code should follow Devvit framework best practices and Reddit platform guidelines.

## Devvit Development Standards

- Use Devvit's component system (Devvit.addCustomPostType, Devvit.addMenuItem)
- Follow Reddit's content policy and community guidelines
- Implement proper Reddit API integration using Devvit's built-in methods
- Use Devvit's state management (useState, useAsync, useInterval)
- Leverage Devvit's UI components (vstack, hstack, text, button, image)
- Handle Reddit context (subreddit, user, post) appropriately

## Code Organization

- Structure around Devvit app lifecycle (main.tsx, components, handlers)
- Separate game logic from UI rendering using Devvit patterns
- Use Devvit's built-in Redis for game state persistence
- Implement proper error handling for Reddit API calls
- Follow Devvit's TypeScript patterns and interfaces

## Documentation Requirements

- Document Devvit-specific implementations and patterns
- Include Reddit integration details (subreddit context, user permissions)
- Explain game mechanics within Reddit's UI constraints
- Document Devvit deployment and installation process
- Include Reddit community engagement strategies

## Testing Approach

- Test within Devvit's development environment
- Validate Reddit API integration and rate limits
- Test game state persistence with Redis
- Ensure compatibility across different subreddit contexts
- Test user permissions and moderation features
