
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Target, UserIcon } from "lucide-react";
import type { User } from "@shared/schema";
import EditableTextField from "./editable-text-field";
import EditableArrayField from "./editable-array-field";

interface OtherProfileDataCardProps {
  user: User;
  updateProfileMutation: any;
}

export default function OtherProfileDataCard({ user, updateProfileMutation }: OtherProfileDataCardProps) {
  const profileData = user.profileData as any || {};
  
  // Local state for input fields
  const [localBusinessType, setLocalBusinessType] = useState("");
  const [localBusinessLocation, setLocalBusinessLocation] = useState("");

  // Initialize local state when user data loads
  useEffect(() => {
    setLocalBusinessType(profileData.businessType || "");
    setLocalBusinessLocation(profileData.businessLocation || "");
  }, [profileData.businessType, profileData.businessLocation]);

  // Helpers for array normalization and updates
  const normalizeLabel = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const uniqueMerge = (arr: string[]) => {
    const map = new Map<string, string>();
    arr.forEach((v) => {
      if (v && typeof v === 'string') {
        const key = v.trim().toLowerCase();
        if (key) map.set(key, normalizeLabel(v));
      }
    });
    return Array.from(map.values());
  };

  // Business Type handlers
  const handleSaveBusinessType = (value: string) => {
    const newProfileData = {
      ...profileData,
      businessType: value || null
    };
    updateProfileMutation.mutate({ profileData: newProfileData });
  };

  const handleClearBusinessType = () => {
    const newProfileData = {
      ...profileData,
      businessType: null
    };
    updateProfileMutation.mutate({ profileData: newProfileData });
  };

  // Business Location handlers
  const handleSaveBusinessLocation = (value: string) => {
    const newProfileData = {
      ...profileData,
      businessLocation: value || null
    };
    updateProfileMutation.mutate({ profileData: newProfileData });
  };

  const handleClearBusinessLocation = () => {
    const newProfileData = {
      ...profileData,
      businessLocation: null
    };
    updateProfileMutation.mutate({ profileData: newProfileData });
  };

  // Brand Voice handlers
  const addBrandVoice = () => {
    const value = window.prompt('Add a brand voice trait (e.g., Professional, Friendly, Inspiring)');
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const current = Array.isArray(profileData.brandVoice) ? profileData.brandVoice : [];
    const next = uniqueMerge([...current, label]);
    const newProfileData = { ...profileData, brandVoice: next };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  const removeBrandVoice = (index: number) => {
    const current = Array.isArray(profileData.brandVoice) ? profileData.brandVoice : [];
    const next = current.filter((_, i) => i !== index);
    const newProfileData = { ...profileData, brandVoice: next };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  const deleteAllBrandVoice = () => {
    const newProfileData = { ...profileData, brandVoice: [] };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  // Content Goals handlers
  const addContentGoal = () => {
    const value = window.prompt('Add a content goal (e.g., Increase engagement, Build trust, Drive sales)');
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const current = Array.isArray(profileData.contentGoals) ? profileData.contentGoals : [];
    const next = uniqueMerge([...current, label]);
    const newProfileData = { ...profileData, contentGoals: next };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  const removeContentGoal = (index: number) => {
    const current = Array.isArray(profileData.contentGoals) ? profileData.contentGoals : [];
    const next = current.filter((_, i) => i !== index);
    const newProfileData = { ...profileData, contentGoals: next };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  const deleteAllContentGoals = () => {
    const newProfileData = { ...profileData, contentGoals: [] };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  // Target Audience handlers
  const addTargetAudience = () => {
    const value = window.prompt('Add a target audience segment (e.g., Young professionals, Parents, Students)');
    if (!value) return;
    const label = normalizeLabel(value);
    if (!label) return;
    const current = Array.isArray(profileData.targetAudience) ? profileData.targetAudience : [];
    const next = uniqueMerge([...current, label]);
    const newProfileData = { ...profileData, targetAudience: next };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  const removeTargetAudience = (index: number) => {
    const current = Array.isArray(profileData.targetAudience) ? profileData.targetAudience : [];
    const next = current.filter((_, i) => i !== index);
    const newProfileData = { ...profileData, targetAudience: next };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  const deleteAllTargetAudience = () => {
    const newProfileData = { ...profileData, targetAudience: [] };
    updateProfileMutation.mutate({ profileData: newProfileData, replaceArrays: true } as any);
  };

  // Filter out the special analysis data
  const otherData = { ...profileData };
  delete otherData.instagramProfile;
  delete otherData.competitorAnalyses;
  delete otherData.blogProfile;
  delete otherData.hashtagSearches;
  delete otherData.businessType;
  delete otherData.businessLocation;
  delete otherData.brandVoice;
  delete otherData.contentGoals;
  delete otherData.targetAudience;

  const brandVoice = Array.isArray(profileData.brandVoice) ? profileData.brandVoice : [];
  const contentGoals = Array.isArray(profileData.contentGoals) ? profileData.contentGoals : [];
  const targetAudience = Array.isArray(profileData.targetAudience) ? profileData.targetAudience : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Database className="h-5 w-5 text-muted-foreground" />
          <span>Other Profile Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Editable Business Type */}
          <EditableTextField
            label="Business Type"
            value={localBusinessType}
            placeholder="e.g., Therapy Practice, Coaching Service, Wellness Center"
            onSave={handleSaveBusinessType}
            onClear={handleClearBusinessType}
            isUpdating={updateProfileMutation.isPending}
          />

          {/* Editable Business Location */}
          <EditableTextField
            label="Business Location"
            value={localBusinessLocation}
            placeholder="e.g., Helsinki, Finland or Online"
            onSave={handleSaveBusinessLocation}
            onClear={handleClearBusinessLocation}
            isUpdating={updateProfileMutation.isPending}
          />

          {/* Editable Brand Voice */}
          <div className="bg-card p-4 rounded-lg border">
            <EditableArrayField
              title="Brand Voice"
              icon={<svg className="h-4 w-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>}
              items={brandVoice}
              onAdd={addBrandVoice}
              onRemove={removeBrandVoice}
              onDeleteAll={deleteAllBrandVoice}
              isUpdating={updateProfileMutation.isPending}
            />
          </div>

          {/* Editable Content Goals */}
          <div className="bg-card p-4 rounded-lg border">
            <EditableArrayField
              title="Content Goals"
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
              items={contentGoals}
              onAdd={addContentGoal}
              onRemove={removeContentGoal}
              onDeleteAll={deleteAllContentGoals}
              isUpdating={updateProfileMutation.isPending}
            />
          </div>

          {/* Editable Target Audience */}
          <div className="bg-card p-4 rounded-lg border">
            <EditableArrayField
              title="Target Audience"
              icon={<UserIcon className="h-4 w-4 text-muted-foreground" />}
              items={targetAudience}
              onAdd={addTargetAudience}
              onRemove={removeTargetAudience}
              onDeleteAll={deleteAllTargetAudience}
              isUpdating={updateProfileMutation.isPending}
            />
          </div>

          {/* Read-only Other Data */}
          {Object.entries(otherData).map(([key, value]) => {
            if (value === null || value === undefined) return null;
            
            return (
              <div key={key} className="bg-card p-3 rounded-lg border">
                <label className="text-sm font-medium text-muted-foreground capitalize mb-1 block">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
                {Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-1">
                    {value.map((item: any, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {typeof item === 'string' ? item : JSON.stringify(item)}
                      </Badge>
                    ))}
                  </div>
                ) : typeof value === 'object' ? (
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-2 rounded">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-foreground">{String(value)}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
