# Weekly Leaderboard Post System

This document explains how to set up and use the automated weekly leaderboard posting system for Color Dot Rush.

## Overview

The weekly leaderboard system automatically creates engaging Reddit posts every Monday showcasing the previous week's top players. This drives community engagement and follows Reddit's best practices for content flywheels.

## Features

- 🏆 **Automatic Weekly Posts**: Posts every Monday at 9 AM
- 📊 **Rich Leaderboard Data**: Shows top 20 players with scores and rankings
- 🎯 **Engaging Content**: Formatted posts with emojis and statistics
- ⚡ **Flexible Scheduling**: Can be triggered manually or via external services
- 🔄 **Error Handling**: Robust error handling and fallback mechanisms

## System Architecture

```
External Scheduler (GitHub Actions/Cron) 
    ↓
HTTP Request to Devvit App
    ↓
Weekly Leaderboard Post Service
    ↓
Reddit API (via Devvit)
    ↓
Reddit Post Created
```

## Setup Instructions

### 1. Deploy Your Devvit App

First, make sure your Color Dot Rush app is deployed and accessible:

```bash
npm run deploy
```

Note your app's URL (e.g., `https://your-app.devvit.app`).

### 2. Set Up GitHub Actions (Recommended)

1. **Copy the workflow file**:
   ```bash
   cp scripts/github-actions-weekly-leaderboard.yml .github/workflows/weekly-leaderboard.yml
   ```

2. **Add secrets to your GitHub repository**:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `DEVVIT_APP_URL`: Your deployed Devvit app URL
     - `DEVVIT_API_KEY`: (Optional) API key if authentication is required

3. **Enable the workflow**:
   - The workflow will automatically run every Monday at 9 AM UTC
   - You can also trigger it manually from the Actions tab

### 3. Alternative: External Cron Service

If you prefer not to use GitHub Actions, you can use any external cron service:

#### Using a VPS/Server:
```bash
# Add to crontab (runs every Monday at 9 AM UTC)
0 9 * * 1 cd /path/to/color-rush && node scripts/weekly-leaderboard-cron.js --execute
```

#### Using AWS Lambda:
1. Create a Lambda function with the cron script
2. Set up EventBridge (CloudWatch Events) to trigger every Monday
3. Configure environment variables for your Devvit app URL

#### Using other services:
- **Vercel Cron Jobs**: Use Vercel's cron functionality
- **Railway**: Use Railway's cron jobs
- **Heroku Scheduler**: Use Heroku's add-on

## API Endpoints

The system provides several endpoints for monitoring and manual execution:

### Manual Execution
```bash
# Execute weekly leaderboard post immediately
curl -X POST https://your-app.devvit.app/internal/weekly-leaderboard-post

# Execute all scheduled tasks
curl -X POST https://your-app.devvit.app/internal/execute-scheduled-tasks
```

### Status Checking
```bash
# Check if it's time to post
curl https://your-app.devvit.app/internal/weekly-leaderboard-status

# Check scheduled tasks status
curl https://your-app.devvit.app/internal/scheduled-tasks-status
```

## Post Content Format

The system generates engaging posts with the following structure:

```
🏆 Weekly Color Dot Rush Leaderboard - [Date Range]

## 🎯 Top Players This Week

| Rank | Player | Score |
|------|--------|-------|
| 🥇 1 | u/PlayerName | 1,500 |
| 🥈 2 | u/PlayerName | 1,200 |
| 🥉 3 | u/PlayerName | 1,000 |
...

## 📊 Weekly Stats
- Total Players: 150
- Top Score: 1,500
- Average Score: 850

## 🎯 How to Play
[Game instructions and engagement text]

## 🏆 Next Week's Challenge
[Encouragement to compete next week]
```

## Configuration

### Timing Configuration

The system posts every Monday between 9 AM and 11 AM. You can modify this in:

- **Server**: `src/server/core/weeklyLeaderboardPost.ts` - `shouldPostWeeklyLeaderboard()` function
- **GitHub Actions**: `.github/workflows/weekly-leaderboard.yml` - cron schedule
- **External Cron**: Your cron configuration

### Content Customization

You can customize the post content by modifying:

- **Post Template**: `src/server/core/weeklyLeaderboardPost.ts` - `generateWeeklyPostContent()` function
- **Leaderboard Size**: Change the number of top players shown (default: 20)
- **Statistics**: Add or modify weekly statistics
- **Engagement Text**: Customize the call-to-action and instructions

## Monitoring and Troubleshooting

### Check System Status

```bash
# Check if system is working
node scripts/weekly-leaderboard-cron.js --status

# Force execution for testing
node scripts/weekly-leaderboard-cron.js --execute
```

### Common Issues

1. **No leaderboard data**: 
   - Check if players have submitted scores
   - Verify Redis connection and data storage

2. **Post creation fails**:
   - Check Reddit API permissions
   - Verify subreddit access and posting permissions

3. **Scheduling issues**:
   - Check timezone settings
   - Verify cron schedule or GitHub Actions timing

### Logs and Debugging

The system provides comprehensive logging:

- **Server logs**: Check your Devvit app logs for detailed execution information
- **GitHub Actions logs**: View execution logs in the Actions tab
- **Cron logs**: Check your system logs for cron execution

## Testing

### Manual Testing

```bash
# Test the cron script locally
DEVVIT_APP_URL=https://your-app.devvit.app node scripts/weekly-leaderboard-cron.js --execute

# Test specific endpoints
curl -X POST https://your-app.devvit.app/internal/weekly-leaderboard-post
```

### Production Testing

1. **Test with small data**: Use a test subreddit with limited data
2. **Verify post format**: Check that posts appear correctly formatted
3. **Monitor performance**: Ensure the system completes within timeout limits

## Security Considerations

- **API Keys**: Store sensitive credentials in environment variables or secrets
- **Rate Limiting**: The system respects Reddit's API rate limits
- **Error Handling**: Failed posts don't crash the system
- **Data Privacy**: Only public leaderboard data is posted

## Future Enhancements

Potential improvements to consider:

1. **Multiple Subreddits**: Post to multiple subreddits where the app is installed
2. **Custom Templates**: Allow subreddit-specific post templates
3. **Analytics**: Track post engagement and player response
4. **Awards**: Integrate with Reddit awards system
5. **Seasonal Events**: Special posts for holidays or special events

## Support

If you encounter issues:

1. Check the logs for error messages
2. Verify your Devvit app is deployed and accessible
3. Test the endpoints manually
4. Check Reddit API permissions and subreddit access

For additional help, refer to the main project documentation or create an issue in the repository.
