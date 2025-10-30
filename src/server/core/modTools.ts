import { context, reddit } from '@devvit/web/server';
import { getPostConfiguration, updatePostConfiguration, getConfigurationStatus } from './postConfiguration';
import { createDailyChallengePost } from './dailyChallengePost';
import { createWeeklyLeaderboardPost } from './weeklyLeaderboardPost';
import { executeScheduledTasks } from './scheduledTasks';

/**
 * Reddit Mod Tools Integration
 * Provides moderator interface for managing daily challenges and social sharing
 */

export interface ModToolsConfig {
  enabled: boolean;
  showAdvancedOptions: boolean;
  allowManualPosting: boolean;
  allowConfigurationChanges: boolean;
}

/**
 * Get moderator tools configuration
 */
export async function getModToolsConfig(): Promise<ModToolsConfig> {
  try {
    const config = await getPostConfiguration();
    
    return {
      enabled: true,
      showAdvancedOptions: true,
      allowManualPosting: true,
      allowConfigurationChanges: true,
    };
  } catch (error) {
    console.error('Error getting mod tools config:', error);
    return {
      enabled: false,
      showAdvancedOptions: false,
      allowManualPosting: false,
      allowConfigurationChanges: false,
    };
  }
}

/**
 * Create moderator tools menu items
 */
export async function createModToolsMenu(): Promise<Array<{
  text: string;
  url: string;
  description: string;
}>> {
  try {
    const { subredditName } = context;
    if (!subredditName) {
      throw new Error('subredditName is required');
    }
    
    const baseUrl = `https://reddit.com/r/${subredditName}`;
    
    return [
      {
        text: '🎯 Daily Challenge Settings',
        url: `${baseUrl}/modtools/daily-challenge`,
        description: 'Configure daily challenge posting and settings'
      },
      {
        text: '📊 Weekly Leaderboard Settings', 
        url: `${baseUrl}/modtools/weekly-leaderboard`,
        description: 'Configure weekly leaderboard posting and settings'
      },
      {
        text: '📱 Social Sharing Settings',
        url: `${baseUrl}/modtools/social-sharing`,
        description: 'Configure social sharing platforms and messages'
      },
      {
        text: '⚙️ System Configuration',
        url: `${baseUrl}/modtools/configuration`,
        description: 'View and modify system configuration'
      },
      {
        text: '📈 Analytics Dashboard',
        url: `${baseUrl}/modtools/analytics`,
        description: 'View participation and sharing statistics'
      },
      {
        text: '🔧 Manual Controls',
        url: `${baseUrl}/modtools/manual`,
        description: 'Manual posting and task execution'
      }
    ];
  } catch (error) {
    console.error('Error creating mod tools menu:', error);
    return [];
  }
}

/**
 * Get system status for mod tools
 */
export async function getSystemStatus(): Promise<{
  dailyChallenge: {
    enabled: boolean;
    nextPost: string;
    lastPost?: string;
    participants: number;
  };
  weeklyLeaderboard: {
    enabled: boolean;
    nextPost: string;
    lastPost?: string;
    totalPlayers: number;
  };
  socialSharing: {
    enabled: boolean;
    platforms: string[];
    totalShares: number;
  };
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    lastExecution: string;
    errors: number;
  };
}> {
  try {
    const config = await getConfigurationStatus();
    
    return {
      dailyChallenge: {
        enabled: config.dailyChallenge.autoPost,
        nextPost: config.dailyChallenge.nextPost?.toISOString() || 'Not scheduled',
        participants: 0, // Would be fetched from Redis
      },
      weeklyLeaderboard: {
        enabled: config.weeklyLeaderboard.autoPost,
        nextPost: config.weeklyLeaderboard.nextPost?.toISOString() || 'Not scheduled',
        totalPlayers: 0, // Would be fetched from Redis
      },
      socialSharing: {
        enabled: config.socialSharing.enabled,
        platforms: config.socialSharing.platforms,
        totalShares: 0, // Would be fetched from Redis
      },
      systemHealth: {
        status: 'healthy',
        lastExecution: new Date().toISOString(),
        errors: 0,
      },
    };
  } catch (error) {
    console.error('Error getting system status:', error);
    return {
      dailyChallenge: { enabled: false, nextPost: 'Error', participants: 0 },
      weeklyLeaderboard: { enabled: false, nextPost: 'Error', totalPlayers: 0 },
      socialSharing: { enabled: false, platforms: [], totalShares: 0 },
      systemHealth: { status: 'error', lastExecution: 'Never', errors: 1 },
    };
  }
}

/**
 * Execute moderator action
 */
export async function executeModAction(
  action: string,
  parameters: Record<string, any> = {}
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    switch (action) {
      case 'create_daily_post':
        const dailyResult = await createDailyChallengePost();
        return {
          success: dailyResult.success,
          message: dailyResult.success 
            ? 'Daily challenge post created successfully' 
            : dailyResult.error || 'Failed to create daily challenge post',
          data: dailyResult,
        };
        
      case 'create_weekly_post':
        const weeklyResult = await createWeeklyLeaderboardPost();
        return {
          success: weeklyResult.success,
          message: weeklyResult.success 
            ? 'Weekly leaderboard post created successfully' 
            : weeklyResult.error || 'Failed to create weekly leaderboard post',
          data: weeklyResult,
        };
        
      case 'execute_scheduled_tasks':
        const taskResults = await executeScheduledTasks();
        const successCount = taskResults.filter(r => r.success).length;
        return {
          success: true,
          message: `Executed ${taskResults.length} scheduled tasks. ${successCount} successful.`,
          data: taskResults,
        };
        
      case 'update_configuration':
        const configResult = await updatePostConfiguration(parameters);
        return {
          success: configResult.success,
          message: configResult.success 
            ? 'Configuration updated successfully' 
            : configResult.error || 'Failed to update configuration',
        };
        
      case 'get_status':
        const status = await getSystemStatus();
        return {
          success: true,
          message: 'System status retrieved successfully',
          data: status,
        };
        
      default:
        return {
          success: false,
          message: `Unknown action: ${action}`,
        };
    }
  } catch (error) {
    console.error(`Error executing mod action ${action}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Create mod tools post with current status
 */
export async function createModToolsStatusPost(): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const { subredditName } = context;
    if (!subredditName) {
      throw new Error('subredditName is required');
    }
    
    const status = await getSystemStatus();
    const config = await getPostConfiguration();
    
    const title = `🔧 Color Rush Mod Tools - System Status`;
    
    const content = `# 🔧 Color Rush Mod Tools - System Status

## 📊 Current System Status

### 🎯 Daily Challenge
- **Status**: ${status.dailyChallenge.enabled ? '✅ Enabled' : '❌ Disabled'}
- **Next Post**: ${status.dailyChallenge.nextPost}
- **Participants**: ${status.dailyChallenge.participants}
- **Post Time**: ${config.dailyChallenge.postTime} ${config.dailyChallenge.timezone}

### 📈 Weekly Leaderboard  
- **Status**: ${status.weeklyLeaderboard.enabled ? '✅ Enabled' : '❌ Disabled'}
- **Next Post**: ${status.weeklyLeaderboard.nextPost}
- **Total Players**: ${status.weeklyLeaderboard.totalPlayers}
- **Post Day**: ${getDayName(config.weeklyLeaderboard.postDay)} at ${config.weeklyLeaderboard.postTime} ${config.weeklyLeaderboard.timezone}

### 📱 Social Sharing
- **Status**: ${status.socialSharing.enabled ? '✅ Enabled' : '❌ Disabled'}
- **Platforms**: ${status.socialSharing.platforms.join(', ')}
- **Total Shares**: ${status.socialSharing.totalShares}

### ⚙️ System Health
- **Status**: ${getHealthStatusEmoji(status.systemHealth.status)} ${status.systemHealth.status.toUpperCase()}
- **Last Execution**: ${status.systemHealth.lastExecution}
- **Errors**: ${status.systemHealth.errors}

## 🎛️ Quick Actions

### Manual Posting
- **Create Daily Challenge Post**: Use \`/internal/daily-challenge-post\` endpoint
- **Create Weekly Leaderboard Post**: Use \`/internal/weekly-leaderboard-post\` endpoint
- **Execute All Tasks**: Use \`/internal/execute-scheduled-tasks\` endpoint

### Configuration
- **View Config**: \`GET /api/post-configuration\`
- **Update Config**: \`POST /api/post-configuration\` with JSON body
- **View Status**: \`GET /api/configuration-status\`

### Monitoring
- **Task Status**: \`GET /internal/scheduled-tasks-status\`
- **Share Stats**: \`GET /api/share-statistics\`
- **Challenge Info**: \`GET /api/daily-challenge-info\`

## 📝 Configuration Examples

### Disable Daily Challenges
\`\`\`json
{
  "dailyChallenge": {
    "enabled": false
  }
}
\`\`\`

### Change Posting Times
\`\`\`json
{
  "dailyChallenge": {
    "postTime": "10:00"
  },
  "weeklyLeaderboard": {
    "postTime": "11:00"
  }
}
\`\`\`

### Disable Social Sharing
\`\`\`json
{
  "socialSharing": {
    "enabled": false
  }
}
\`\`\`

---

*This post is automatically generated for moderators. Use the API endpoints above to manage the system.*`;

    const post = await reddit.submitPost({
      subredditName: subredditName,
      title: title,
      text: content,
      flairId: 'Mod Tools',
    });
    
    return {
      success: true,
      postId: post.id,
    };
    
  } catch (error) {
    console.error('Error creating mod tools status post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper functions
 */
function getDayName(dayNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Unknown';
}

function getHealthStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    default: return '❓';
  }
}
