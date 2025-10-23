
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserIcon, Edit, X } from "lucide-react";
import type { User } from "@shared/schema";
import EditableTextField from "./editable-text-field";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BasicProfileCardProps {
  user: User;
}

export default function BasicProfileCard({ user }: BasicProfileCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<User>) => {
      const response = await apiRequest("PATCH", "/api/auth/user/profile", profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Success", description: "Profile updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: `Failed to update profile: ${err?.message || err}`, variant: "destructive" });
    },
  });

  const handleSaveFirstName = (value: string) => {
    updateProfileMutation.mutate({ firstName: value } as any);
  };

  const handleSaveLastName = (value: string) => {
    updateProfileMutation.mutate({ lastName: value } as any);
  };

  const displayName = user.firstName || user.lastName
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : "Not provided";

  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserIcon className="h-5 w-5" />
          <span>Basic Information</span>
        </CardTitle>
        <CardDescription>
          Your account information from Replit authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="mt-1 text-foreground" data-testid="text-user-email">{user.email}</p>
          </div>
          <div>
            <div className="flex items-start justify-between">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="mt-1 text-foreground mb-3" data-testid="text-user-name">{displayName}</p>
              </div>
              <div className="ml-4">
                {!editing ? (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(true)} data-testid="button-edit-name">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)} data-testid="button-cancel-edit-name">
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                )}
              </div>
            </div>

            {editing && (
              <div className="space-y-2">
                <EditableTextField
                  label="First name"
                  value={user.firstName || ''}
                  placeholder="First name"
                  onSave={handleSaveFirstName}
                  onClear={() => handleSaveFirstName('')}
                  isUpdating={updateProfileMutation.isPending}
                />
                <EditableTextField
                  label="Last name"
                  value={user.lastName || ''}
                  placeholder="Last name"
                  onSave={handleSaveLastName}
                  onClear={() => handleSaveLastName('')}
                  isUpdating={updateProfileMutation.isPending}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
