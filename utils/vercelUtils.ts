import { getLogger } from '@/utils/logger';

const logger = getLogger('utils:vercel');

/**
 * Checks if the code is running in Vercel's production environment
 */
export function isVercelProduction(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

/**
 * Gets the memory limits based on the environment
 * Vercel functions have different memory limits in their free tier
 */
export function getMemoryLimits() {
  const vercelEnv = process.env.VERCEL_ENV;
  const isVercel = !!vercelEnv;
  
  if (isVercel) {
    const memoryLimitMB = 1024; // 1GB limit on Vercel
    
    return {
      memoryLimitMB,
      isVercel,
      vercelEnv
    };
  }
  
  return {
    memoryLimitMB: 4096, // 4GB for local development
    isVercel,
    vercelEnv
  };
}

/**
 * Creates a memory usage monitor that logs current memory usage
 * @param context The context for the logger
 * @param intervalMs How often to log memory usage (in ms)
 * @returns A function to stop the monitoring
 */
export function monitorMemoryUsage(context: string = 'memory-monitor', intervalMs: number = 5000) {
  if (typeof process === 'undefined' || !process.memoryUsage) {
    logger.warn('Memory monitoring not available in this environment');
    return () => {}; // Return no-op function
  }
  
  const { isVercel, memoryLimitMB } = getMemoryLimits();
  const monitorLogger = getLogger(context);
  
  monitorLogger.info('Starting memory monitoring', { 
    isVercel, 
    memoryLimitMB, 
    intervalMs 
  });
  
  // Set up a regular check of memory usage
  const intervalId = setInterval(() => {
    try {
      const memoryUsage = process.memoryUsage();
      const rssUsageMB = Math.round(memoryUsage.rss / 1024 / 1024);
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const percentUsed = Math.round((rssUsageMB / memoryLimitMB) * 100);
      
      // Always log high memory usage or periodically log normal usage
      if (percentUsed > 80) {
        monitorLogger.warn('High memory usage detected', {
          rss: `${rssUsageMB}MB`,
          heapUsed: `${heapUsedMB}MB`,
          percentUsed: `${percentUsed}%`,
          memoryLimit: `${memoryLimitMB}MB`
        });
      } else {
        monitorLogger.info('Memory usage', {
          rss: `${rssUsageMB}MB`,
          heapUsed: `${heapUsedMB}MB`,
          percentUsed: `${percentUsed}%`
        });
      }
      
      // Try to force garbage collection if available and usage is high
      if (global.gc && percentUsed > 70) {
        monitorLogger.info('Running garbage collection due to high memory usage');
        global.gc();
      }
      
    } catch (error) {
      monitorLogger.error('Error monitoring memory', { error });
    }
  }, intervalMs);
  
  // Return a function to stop monitoring
  return () => {
    clearInterval(intervalId);
    monitorLogger.info('Memory monitoring stopped');
  };
}

/**
 * Checks if the current execution environment might run into time limits
 * Vercel has a 10s (Hobby) or 60s (Pro) execution limit for serverless functions
 */
export function checkExecutionTimeLimits(): { 
  hasTimeLimit: boolean, 
  maxExecutionMs: number 
} {
  const vercelEnv = process.env.VERCEL_ENV;
  
  if (vercelEnv === 'production') {
    // Vercel has a limit of 10s for hobby plans
    const isProPlan = process.env.VERCEL_PLAN === 'pro';
    
    return {
      hasTimeLimit: true,
      maxExecutionMs: isProPlan ? 60000 : 10000
    };
  }
  
  return {
    hasTimeLimit: false,
    maxExecutionMs: 0 // No limit
  };
}

/**
 * Creates a timeout for Vercel serverless functions
 * @param timeoutMs Maximum execution time in milliseconds
 * @returns A promise that rejects if the timeout is reached
 */
export function createVercelTimeout(timeoutMs: number = 9000): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Vercel function timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Creates a background task for heavy processing that might exceed Vercel's timeout
 * This is a simple implementation - for production use, consider using a queue system
 * @param asyncTask The async task to execute
 * @param context The context for logging
 */
export async function executeBackgroundTask<T>(
  asyncTask: () => Promise<T>,
  context: string = 'background-task'
): Promise<{ success: boolean, message: string }> {
  const taskLogger = getLogger(context);
  
  try {
    // Execute the task without waiting
    (async () => {
      try {
        taskLogger.info('Starting background task');
        await asyncTask();
        taskLogger.info('Background task completed successfully');
      } catch (error) {
        taskLogger.error('Background task failed', { error });
      }
    })();
    
    return { 
      success: true, 
      message: 'Background task started' 
    };
  } catch (error) {
    taskLogger.error('Failed to start background task', { error });
    return { 
      success: false, 
      message: 'Failed to start background task' 
    };
  }
} 