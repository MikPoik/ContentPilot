
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, X } from "lucide-react";

interface EditableArrayFieldProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onDeleteAll: () => void;
  isUpdating?: boolean;
  testId?: string;
}

export default function EditableArrayField({
  title,
  icon,
  items,
  onAdd,
  onRemove,
  onDeleteAll,
  isUpdating = false,
  testId
}: EditableArrayFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {icon}
          <label className="text-sm font-medium text-gray-700">{title}</label>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdd}
            disabled={isUpdating}
            data-testid={testId ? `button-add-${testId}` : undefined}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
          {items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={isUpdating}
                  data-testid={testId ? `button-delete-${testId}` : undefined}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {title}</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {title.toLowerCase()}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteAll}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2" data-testid={testId ? `${testId}-list` : undefined}>
          {items.map((item: string, index: number) => (
            <Badge key={index} variant="secondary" className="text-sm flex items-center">
              <span>{String(item)}</span>
              <button
                className="ml-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                onClick={() => onRemove(index)}
                title="Remove"
                data-testid={testId ? `button-remove-${testId}-${index}` : undefined}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No {title.toLowerCase()} defined. Click "Add" to get started.</p>
      )}
    </div>
  );
}
