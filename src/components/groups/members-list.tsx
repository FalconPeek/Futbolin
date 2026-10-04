"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  leaveGroup,
  removeMember,
  setMemberRole,
} from "@/actions/groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Member {
  userId: string;
  name: string;
  position?: string;
  role: "admin" | "member";
}

interface MembersListProps {
  groupId: string;
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}

export function MembersList({
  groupId,
  members,
  currentUserId,
  isAdmin,
}: MembersListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMakeAdmin = (userId: string) => {
    startTransition(async () => {
      const result = await setMemberRole({
        groupId,
        userId,
        role: "admin",
      });
      if (result.ok) {
        toast.success("Promovido a admin.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleRemoveMember = (userId: string) => {
    startTransition(async () => {
      const result = await removeMember({ groupId, userId });
      if (result.ok) {
        toast.success("Miembro removido.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleLeaveGroup = () => {
    startTransition(async () => {
      const result = await leaveGroup({ groupId });
      if (result.ok) {
        router.push(result.data.redirectTo);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-0">
      {members.map((member, index) => (
        <div key={member.userId}>
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Avatar className="flex-shrink-0">
                <AvatarFallback>
                  {member.name
                    .split(" ")
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-body-strong text-foreground">
                    {member.name}
                  </p>
                  {member.userId === currentUserId && (
                    <span className="text-small text-muted-foreground">
                      (vos)
                    </span>
                  )}
                  {member.role === "admin" && (
                    <Badge variant="neutral">Admin</Badge>
                  )}
                </div>
                {member.position && (
                  <p className="label-caps text-muted-foreground">
                    {member.position}
                  </p>
                )}
              </div>
            </div>

            {isAdmin && member.userId !== currentUserId && (
              <div className="flex gap-2 flex-shrink-0">
                {member.role === "member" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMakeAdmin(member.userId)}
                    disabled={isPending}
                  >
                    Hacer admin
                  </Button>
                )}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                    >
                      Quitar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Quitar del grupo</DialogTitle>
                      <DialogDescription>
                        ¿Quitar a {member.name} del grupo?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleRemoveMember(member.userId);
                        }}
                        disabled={isPending}
                      >
                        Quitar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
          {index < members.length - 1 && <Separator />}
        </div>
      ))}

      <div className="p-4 pt-6">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" block>
              Salir del grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salir del grupo</DialogTitle>
              <DialogDescription>¿Salir del grupo?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleLeaveGroup}
                disabled={isPending}
              >
                Salir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
