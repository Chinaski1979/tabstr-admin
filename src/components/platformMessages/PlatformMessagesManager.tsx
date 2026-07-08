import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";
import type { PlatformMessage } from "@/types";
import {
  useCreatePlatformMessage,
  useDeletePlatformMessage,
  useTogglePlatformMessageStatus,
  useUpdatePlatformMessage,
} from "@/hooks/usePlatformMessages";

type FormState = {
  messageText: string;
  expiresAt: string;
  isActive: boolean;
  isUrgent: boolean;
  isDismissible: boolean;
};

const EMPTY_FORM: FormState = {
  messageText: "",
  expiresAt: "",
  isActive: true,
  isUrgent: false,
  isDismissible: true,
};

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultExpiresAt(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toLocalDatetimeValue(date);
}

function messageToForm(message: PlatformMessage): FormState {
  return {
    messageText: message.messageText,
    expiresAt: toLocalDatetimeValue(message.expiresAt),
    isActive: message.isActive,
    isUrgent: message.isUrgent,
    isDismissible: message.isDismissible,
  };
}

interface PlatformMessageFormProps {
  form: FormState;
  onChange: (form: FormState) => void;
  scopeLabel: string;
}

function PlatformMessageForm({ form, onChange, scopeLabel }: PlatformMessageFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">{scopeLabel}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="messageText">Message</Label>
        <Input
          id="messageText"
          value={form.messageText}
          maxLength={200}
          placeholder="New feature available…"
          onChange={(e) => onChange({ ...form, messageText: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{form.messageText.length}/200</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expiresAt">Expires at</Label>
        <Input
          id="expiresAt"
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => onChange({ ...form, expiresAt: e.target.value })}
        />
      </div>
      <SwitchRow
        id="isActive"
        label="Active"
        description="Inactive messages are hidden in the POS header."
        checked={form.isActive}
        onCheckedChange={(checked) => onChange({ ...form, isActive: checked })}
      />
      <SwitchRow
        id="isUrgent"
        label="Urgent"
        description="Shows with red styling in the POS header."
        checked={form.isUrgent}
        onCheckedChange={(checked) => onChange({ ...form, isUrgent: checked })}
      />
      <SwitchRow
        id="isDismissible"
        label="Allow users to dismiss"
        description="When off, the message stays visible until it expires or you deactivate it."
        checked={form.isDismissible}
        onCheckedChange={(checked) => onChange({ ...form, isDismissible: checked })}
      />
    </div>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface PlatformMessageDialogProps {
  orgRegistryId?: string | null;
  scopeLabel: string;
  message?: PlatformMessage;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PlatformMessageDialog({
  orgRegistryId = null,
  scopeLabel,
  message,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: PlatformMessageDialogProps) {
  const isEdit = !!message;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { createMessage, isCreating } = useCreatePlatformMessage(orgRegistryId);
  const { updateMessage, isUpdating } = useUpdatePlatformMessage(orgRegistryId);
  const isSubmitting = isCreating || isUpdating;

  useEffect(() => {
    if (open) {
      setForm(message ? messageToForm(message) : { ...EMPTY_FORM, expiresAt: defaultExpiresAt() });
    }
  }, [open, message]);

  const handleSubmit = async () => {
    if (!form.messageText.trim() || !form.expiresAt) return;

    const expiresAt = new Date(form.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return;

    try {
      if (isEdit && message) {
        await updateMessage({
          messageId: message.id,
          input: {
            messageText: form.messageText,
            expiresAt,
            isActive: form.isActive,
            isUrgent: form.isUrgent,
            isDismissible: form.isDismissible,
          },
        });
      } else {
        await createMessage({
          messageText: form.messageText,
          expiresAt,
          isActive: form.isActive,
          isUrgent: form.isUrgent,
          isDismissible: form.isDismissible,
          organizationRegistryId: orgRegistryId,
        });
      }
      setOpen(false);
    } catch {
      // Toast handled in hook.
    }
  };

  const dialog = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit message" : "Create message"}</DialogTitle>
        <DialogDescription>
          Shown in the POS app header for the selected scope.
        </DialogDescription>
      </DialogHeader>
      <PlatformMessageForm form={form} onChange={setForm} scopeLabel={scopeLabel} />
      <DialogFooter>
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting || !form.messageText.trim() || !form.expiresAt || form.messageText.length > 200
          }
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (controlledOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialog}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            New message
          </Button>
        )}
      </DialogTrigger>
      {dialog}
    </Dialog>
  );
}

interface PlatformMessagesTableProps {
  messages: PlatformMessage[];
  orgRegistryId?: string | null;
  showScope?: boolean;
}

export function PlatformMessagesTable({
  messages,
  orgRegistryId = null,
  showScope = false,
}: PlatformMessagesTableProps) {
  const { deleteMessage, isDeleting } = useDeletePlatformMessage(orgRegistryId);
  const { toggleStatus, isToggling } = useTogglePlatformMessageStatus(orgRegistryId);
  const [editingMessage, setEditingMessage] = useState<PlatformMessage | null>(null);

  const scopeLabel =
    orgRegistryId === null || orgRegistryId === undefined
      ? "This message will appear for all organizations."
      : "This message will appear only for this organization.";

  if (messages.length === 0) {
    return null;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Message</TableHead>
            {showScope && <TableHead>Scope</TableHead>}
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.map((message) => {
            const isExpired = message.expiresAt.getTime() <= Date.now();
            return (
              <TableRow key={message.id}>
                <TableCell className="max-w-xs">
                  <div className="flex flex-col gap-1">
                    <span className="truncate text-sm">{message.messageText}</span>
                    <div className="flex flex-wrap gap-1">
                      {message.isUrgent && <Badge variant="destructive">Urgent</Badge>}
                      {!message.isDismissible && <Badge variant="secondary">Pinned</Badge>}
                    </div>
                  </div>
                </TableCell>
                {showScope && (
                  <TableCell>
                    <Badge variant="outline">
                      {message.organizationRegistryId ? "Organization" : "Global"}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(message.expiresAt)}
                  {isExpired && <Badge variant="secondary" className="ml-2">Expired</Badge>}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={message.isActive}
                    disabled={isToggling}
                    onCheckedChange={(checked) =>
                      toggleStatus({ messageId: message.id, isActive: checked })
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingMessage(message)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isDeleting}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete message?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the message from the POS header immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMessage(message.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {editingMessage && (
        <PlatformMessageDialog
          orgRegistryId={orgRegistryId}
          scopeLabel={scopeLabel}
          message={editingMessage}
          open={!!editingMessage}
          onOpenChange={(next) => {
            if (!next) setEditingMessage(null);
          }}
        />
      )}
    </>
  );
}
