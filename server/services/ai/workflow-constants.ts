/**
 * Workflow Phase Constants
 * Single source of truth for workflow phase requirements and transitions
 */

export interface WorkflowPhaseRequirements {
  name: string;
  minCompleteness: number;
  maxCompleteness: number;
  requiredFields: string[];
  optionalFields: string[];
  canGenerateContent: boolean;
  canGenerateIdeas: boolean;
  description: string;
}

export const WORKFLOW_PHASES: Record<string, WorkflowPhaseRequirements> = {
  'Discovery & Personalization': {
    name: 'Discovery & Personalization',
    minCompleteness: 0,
    maxCompleteness: 35,
    requiredFields: ['firstName', 'contentNiche', 'primaryPlatform'],
    optionalFields: ['lastName', 'primaryPlatforms'],
    canGenerateContent: false,
    canGenerateIdeas: false,
    description: 'Getting to know the user and their basic content needs'
  },
  
  'Brand Voice & Positioning': {
    name: 'Brand Voice & Positioning',
    minCompleteness: 35,
    maxCompleteness: 55,
    requiredFields: ['firstName', 'contentNiche', 'primaryPlatform'],
    optionalFields: ['targetAudience', 'brandVoice', 'businessType', 'contentGoals'],
    canGenerateContent: false,
    canGenerateIdeas: false,
    description: 'Understanding brand identity, voice, and target audience'
  },
  
  'Collaborative Idea Generation': {
    name: 'Collaborative Idea Generation',
    minCompleteness: 50,
    maxCompleteness: 60,
    requiredFields: ['firstName', 'contentNiche', 'primaryPlatform'],
    optionalFields: ['targetAudience', 'brandVoice', 'businessType', 'contentGoals'],
    canGenerateContent: false,
    canGenerateIdeas: true,
    description: 'Generating content themes and high-level ideas'
  },
  
  'Developing Chosen Ideas': {
    name: 'Developing Chosen Ideas',
    minCompleteness: 60,
    maxCompleteness: 75,
    requiredFields: ['firstName', 'contentNiche', 'primaryPlatform'],
    optionalFields: ['targetAudience', 'brandVoice', 'businessType'],
    canGenerateContent: true,
    canGenerateIdeas: true,
    description: 'Creating specific content outlines and structures'
  },
  
  'Content Drafting & Iterative Review': {
    name: 'Content Drafting & Iterative Review',
    minCompleteness: 75,
    maxCompleteness: 90,
    requiredFields: ['firstName', 'contentNiche', 'primaryPlatform', 'targetAudience'],
    optionalFields: ['brandVoice', 'businessType', 'contentGoals'],
    canGenerateContent: true,
    canGenerateIdeas: true,
    description: 'Creating full content drafts in the user\'s voice'
  },
  
  'Finalization & Scheduling': {
    name: 'Finalization & Scheduling',
    minCompleteness: 90,
    maxCompleteness: 100,
    requiredFields: ['firstName', 'contentNiche', 'primaryPlatform', 'targetAudience', 'brandVoice'],
    optionalFields: ['businessType', 'contentGoals', 'businessLocation'],
    canGenerateContent: true,
    canGenerateIdeas: true,
    description: 'Optimizing and finalizing content for publication'
  }
};

/**
 * Determine current workflow phase based on user profile
 */
export function determineWorkflowPhase(
  profileCompleteness: number,
  userProfile: {
    firstName?: string;
    contentNiche?: string[];
    primaryPlatform?: string;
    primaryPlatforms?: string[];
    targetAudience?: string;
    brandVoice?: string;
    businessType?: string;
    contentGoals?: string[];
  }
): WorkflowPhaseRequirements {
  // Find the appropriate phase based on completeness score
  for (const [phaseName, requirements] of Object.entries(WORKFLOW_PHASES)) {
    if (profileCompleteness >= requirements.minCompleteness && 
        profileCompleteness <= requirements.maxCompleteness) {
      
      // Verify required fields are present
      const hasRequiredFields = requirements.requiredFields.every(field => {
        if (field === 'primaryPlatform') {
          return userProfile.primaryPlatform || (userProfile.primaryPlatforms && userProfile.primaryPlatforms.length > 0);
        }
        if (field === 'contentNiche') {
          return userProfile.contentNiche && userProfile.contentNiche.length > 0;
        }
        return !!(userProfile as any)[field];
      });

      if (hasRequiredFields) {
        return requirements;
      }
    }
  }

  // Default to Discovery phase if no match
  return WORKFLOW_PHASES['Discovery & Personalization'];
}

/**
 * Get missing fields for current phase
 */
export function getMissingFields(
  phase: WorkflowPhaseRequirements,
  userProfile: {
    firstName?: string;
    lastName?: string;
    contentNiche?: string[];
    primaryPlatform?: string;
    primaryPlatforms?: string[];
    targetAudience?: string;
    brandVoice?: string;
    businessType?: string;
    contentGoals?: string[];
    businessLocation?: string;
  }
): string[] {
  const missing: string[] = [];

  for (const field of phase.requiredFields) {
    if (field === 'primaryPlatform') {
      if (!userProfile.primaryPlatform && (!userProfile.primaryPlatforms || userProfile.primaryPlatforms.length === 0)) {
        missing.push('Primary Platform');
      }
    } else if (field === 'contentNiche') {
      if (!userProfile.contentNiche || userProfile.contentNiche.length === 0) {
        missing.push('Content Niche');
      }
    } else if (field === 'firstName') {
      if (!userProfile.firstName) {
        missing.push('Name');
      }
    } else if (field === 'targetAudience') {
      if (!userProfile.targetAudience) {
        missing.push('Target Audience');
      }
    } else if (field === 'brandVoice') {
      if (!userProfile.brandVoice) {
        missing.push('Brand Voice');
      }
    } else if (field === 'businessType') {
      if (!userProfile.businessType) {
        missing.push('Business Type');
      }
    } else if (field === 'contentGoals') {
      if (!userProfile.contentGoals || userProfile.contentGoals.length === 0) {
        missing.push('Content Goals');
      }
    }
  }

  return missing;
}

/**
 * Check if user can advance to next phase
 */
export function canAdvanceToNextPhase(
  currentPhase: WorkflowPhaseRequirements,
  profileCompleteness: number,
  userProfile: any
): boolean {
  // Check if completeness score is high enough
  if (profileCompleteness < currentPhase.maxCompleteness) {
    return false;
  }

  // Check if all required fields are present
  const missingFields = getMissingFields(currentPhase, userProfile);
  return missingFields.length === 0;
}

/**
 * Get next workflow phase
 */
export function getNextPhase(currentPhaseName: string): WorkflowPhaseRequirements | null {
  const phases = Object.values(WORKFLOW_PHASES);
  const currentIndex = phases.findIndex(p => p.name === currentPhaseName);
  
  if (currentIndex === -1 || currentIndex === phases.length - 1) {
    return null; // Already at final phase
  }
  
  return phases[currentIndex + 1];
}
