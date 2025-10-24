import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Edit } from "lucide-react";

interface EditableTextFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  onClear?: () => void;
  isUpdating?: boolean;
  /**
   * When true, the field starts in read-only mode and shows an edit icon.
   * When false (default), the input is shown immediately (preserves existing behavior).
   */
  showEditToggle?: boolean;
}

export default function EditableTextField({
  label,
  value,
  placeholder,
  onSave,
  onClear,
  isUpdating = false,
  showEditToggle = false,
}: EditableTextFieldProps) {
  const [localValue, setLocalValue] = useState(value);
  // If showEditToggle is true, start in non-editing (read-only) mode; otherwise editable by default
  const [editing, setEditing] = useState(!showEditToggle);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(localValue || "");
  };

  const handleClear = () => {
    setLocalValue("");
    if (onClear) {
      onClear();
    }
  };

  const hasChanged = localValue !== value;

  // Read-only display when toggled off
  if (!editing) {
    return (
      <div className="bg-card p-4 rounded-lg border">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">{label}</label>
        <div className="flex items-center justify-between">
          <div className="text-sm text-foreground">{value || <span className="text-muted-foreground">Not provided</span>}</div>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card p-4 rounded-lg border">
      <label className="text-sm font-medium text-muted-foreground mb-2 block">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-input bg-background text-foreground rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={isUpdating}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            handleSave();
            // close edit mode for toggle-enabled fields
            if (showEditToggle) setEditing(false);
          }}
          disabled={isUpdating || !hasChanged}
          className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
        >
          ✓
        </Button>
        {/* When in toggle mode, X should cancel edits; otherwise act as clear if provided */}
        {showEditToggle ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalValue(value);
              setEditing(false);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={isUpdating}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          localValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={isUpdating}
            >
              <X className="h-4 w-4" />
            </Button>
          )
        )}
      </div>
    </div>
  );
}