
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserIcon } from "lucide-react";
import type { User } from "@shared/schema";

interface BasicProfileCardProps {
  user: User;
}

export default function BasicProfileCard({ user }: BasicProfileCardProps) {
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
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="mt-1 text-foreground" data-testid="text-user-name">
              {user.firstName || user.lastName
                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                : "Not provided"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
