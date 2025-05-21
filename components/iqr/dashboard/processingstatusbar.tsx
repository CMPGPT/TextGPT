import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, FileText, Database, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProcessingStage {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface ProcessingStatusBarProps {
  productId: string;
  isActive: boolean;
  onProcessingComplete?: () => void;
  _onProcessingFailed?: () => void;
  className?: string;
}

// Track active processing bars to prevent duplicates
const activeProcessingBars: {[key: string]: boolean} = {};

// Define all possible processing stages outside the component
// to avoid recreating them on each render
const PROCESSING_STAGES: ProcessingStage[] = [
  {
    key: 'uploading',
    title: 'PDF Uploaded',
    description: 'Uploading your document to secure storage',
    icon: <FileText className="h-4 w-4" />
  },
  {
    key: 'extracting',
    title: 'Processing for Extraction',
    description: 'Sending document to Mistral AI for text extraction',
    icon: <Loader2 className="h-4 w-4 animate-spin" />
  },
  {
    key: 'extracted',
    title: 'Text Extracted',
    description: 'Text content successfully extracted from document',
    icon: <FileText className="h-4 w-4" />
  },
  {
    key: 'chunking',
    title: 'Storing to Database',
    description: 'Dividing content into optimized chunks for processing',
    icon: <Database className="h-4 w-4" />
  },
  {
    key: 'embedding',
    title: 'Optimizing for Search',
    description: 'Creating vector embeddings for AI-powered search',
    icon: <Search className="h-4 w-4" />
  },
  {
    key: 'completed',
    title: 'Processing Complete',
    description: 'Your document is ready for AI-powered chat',
    icon: <FileText className="h-4 w-4" />
  }
];

// Helper function to calculate progress based on stage
const _calculateProgressFromStage = (status: string, chunkCount: number): number => {
  const stageIndex = PROCESSING_STAGES.findIndex(stage => stage.key === status);
  if (stageIndex === -1) return 0;
  
  // Base progress is the percentage of completed stages
  const baseProgress = (stageIndex / (PROCESSING_STAGES.length - 1)) * 100;
  
  // If we're in the embedding stage, factor in chunk count
  if (status === 'embedding' && chunkCount > 0) {
    // Assume embedding is 20% of total progress between the embedding and completed stages
    const embeddingProgress = Math.min(chunkCount * 5, 20); // Cap at 20%
    return baseProgress + embeddingProgress;
  }
  
  return baseProgress;
};

// Split into two components to avoid conditional hook issues
// Inner component only renders when isActive is true
const ActiveProcessingStatusBar = ({
  productId,
  onProcessingComplete,
  _onProcessingFailed,
  className
}: Omit<ProcessingStatusBarProps, 'isActive'>) => {
  // State hooks
  const [currentStage, setCurrentStage] = useState<string>('uploading');
  const [progress, setProgress] = useState<number>(0);
  const [error, _setError] = useState<string | null>(null);
  const [_completed, _setCompleted] = useState<boolean>(false);
  const [isRendered, setIsRendered] = useState<boolean>(false);
  
  // Register this component as active
  useEffect(() => {
    // Set this component as active when mounted
    activeProcessingBars[productId] = true;
    setIsRendered(true);
    console.log(`StatusBar active for product: ${productId}`);
    
    // Cleanup on unmount
    return () => {
      if (isRendered) {
        delete activeProcessingBars[productId];
        console.log(`StatusBar removed for product: ${productId}`);
      }
    };
  }, [productId, isRendered]);

  // Simulate progress for demo purposes (no API calls)
  useEffect(() => {
    if (!productId) return;
    
    console.log(`[ProcessingStatusBar] Starting simulated progress for product: ${productId}`);
    
    // Simulate a staged progress to give visual feedback
    let currentProgress = 0;
    const stages = ['uploading', 'extracting', 'extracted', 'chunking', 'embedding', 'completed'];
    let currentStageIndex = 0;
    
    const progressInterval = setInterval(() => {
      if (currentStageIndex < stages.length) {
        // Update the current stage
        setCurrentStage(stages[currentStageIndex]);
        
        // Calculate progress based on current stage
        currentProgress = (currentStageIndex / (stages.length - 1)) * 100;
        setProgress(currentProgress);
        
        // Move to next stage
        currentStageIndex++;
        
        // If we've reached the final stage
        if (currentStageIndex >= stages.length) {
          _setCompleted(true);
          setProgress(100);
          clearInterval(progressInterval);
          
          if (onProcessingComplete) {
            console.log(`[ProcessingStatusBar] Processing complete for product: ${productId}`);
            onProcessingComplete();
          }
        }
      }
    }, 750); // Update every 750ms to create a smooth progression
    
    // Clean up function
    return () => {
      clearInterval(progressInterval);
    };
  }, [productId, onProcessingComplete]);

  // Helper function to determine if a stage is complete
  const isStageComplete = (stageKey: string): boolean => {
    const currentIndex = PROCESSING_STAGES.findIndex(stage => stage.key === currentStage);
    const stageIndex = PROCESSING_STAGES.findIndex(stage => stage.key === stageKey);
    return stageIndex < currentIndex;
  };

  return (
    <div className={cn("w-full space-y-4 rounded-lg border p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Processing PDF Document</h3>
        <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      
      {/* Progress bar */}
      <Progress value={progress} className="h-2" />
      
      {/* Stage indicators */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        {PROCESSING_STAGES.map((stage) => {
          const isComplete = isStageComplete(stage.key);
          const isCurrent = currentStage === stage.key;
          
          return (
            <div 
              key={stage.key}
              className={cn(
                "flex items-start gap-3 rounded-md p-2 transition-colors",
                isCurrent && "bg-primary/10",
                isComplete ? "text-primary" : "text-muted-foreground opacity-70"
              )}
            >
              <div className="mt-0.5">
                {isCurrent ? 
                  <Loader2 className="h-4 w-4 animate-spin text-primary" /> : 
                  stage.icon
                }
              </div>
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  isComplete || isCurrent ? "text-foreground" : "text-muted-foreground"
                )}>
                  {stage.title}
                </p>
                <p className="text-xs text-muted-foreground">{stage.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-2 text-sm text-red-500">
          Error: {error}
        </div>
      )}
    </div>
  );
};

// Parent wrapper component that conditionally renders the active component
// This pattern ensures hooks are always called consistently
export const ProcessingStatusBar = (props: ProcessingStatusBarProps) => {
  const { isActive, productId } = props;
  
  // Don't render if not active or if already being rendered for this product
  if (!isActive || (activeProcessingBars[productId] === true)) {
    return null;
  }
  
  // Only render the inner component with hooks if we should actually show it
  return <ActiveProcessingStatusBar {...props} />;
};

// Add underscore to unused function
const _onProcessingFailed = () => {
  // Implementation
};