
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function DataUsageInfoCard() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-card-foreground">
          <Shield className="h-5 w-5" />
          <span>How Your Data Is Used</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-foreground mb-2">Data Collection</h4>
            <p className="text-sm text-muted-foreground">
              We collect information from your conversations to understand your content creation needs and preferences.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Personalization</h4>
            <p className="text-sm text-muted-foreground">
              This data helps provide more relevant content suggestions and tailored assistance for your specific niche.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Your Control</h4>
            <p className="text-sm text-muted-foreground">
              You can delete any or all collected information at any time using the controls on this page.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2">Privacy</h4>
            <p className="text-sm text-muted-foreground">
              Your data is stored securely and is only used to improve your ContentCraft AI experience.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
