import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  createRuleAction,
  deleteRuleAction,
  toggleRuleAction
} from "@/app/(dashboard)/dashboard/workspaces/[workspaceId]/rules/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/server/auth/session";
import { getWorkspaceForUser } from "@/server/workspaces/service";

type RulesPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    created?: string;
  }>;
};

export default async function RulesPage({ params, searchParams }: RulesPageProps) {
  const user = await requireUser();
  const { workspaceId } = await params;
  const query = searchParams ? await searchParams : {};
  const workspace = await getWorkspaceForUser(user.id, workspaceId);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-6">
        <Button asChild variant="ghost" className="px-0">
          <Link href={`/dashboard/workspaces/${workspace.id}`}>
            <ArrowLeft />
            Workspace
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Match incoming live events and send actions to the overlay layer.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Rules</CardTitle>
            <CardDescription>Rules run in order of creation for this MVP.</CardDescription>
          </CardHeader>
          <CardContent>
            {workspace.rules.length ? (
              <div className="space-y-3">
                {workspace.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{rule.name}</p>
                        <Badge variant={rule.enabled ? "default" : "muted"}>
                          {rule.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <Badge variant="outline">{rule.triggerType}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {rule.conditionField && rule.operator
                          ? `${rule.conditionField} ${rule.operator} ${rule.conditionValue ?? ""}`
                          : "No condition"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={toggleRuleAction}>
                        <input type="hidden" name="workspaceId" value={workspace.id} />
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <input type="hidden" name="enabled" value={String(rule.enabled)} />
                        <SubmitButton variant="outline" pendingLabel="Saving...">
                          {rule.enabled ? "Disable" : "Enable"}
                        </SubmitButton>
                      </form>
                      <form action={deleteRuleAction}>
                        <input type="hidden" name="workspaceId" value={workspace.id} />
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <SubmitButton variant="destructive" size="icon" pendingLabel="">
                          <Trash2 />
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Add a gift or comment rule to trigger the default overlay.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Create Rule</CardTitle>
          <CardDescription>Start simple: gift name or comment contains text.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.error ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {query.error}
            </div>
          ) : null}
          {query.created ? (
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              Rule created.
            </div>
          ) : null}
          <form action={createRuleAction} className="space-y-4">
            <input type="hidden" name="workspaceId" value={workspace.id} />
            <div className="space-y-2">
              <Label htmlFor="name">Rule name</Label>
              <Input id="name" name="name" placeholder="Rose gift alert" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger</Label>
              <select
                id="triggerType"
                name="triggerType"
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue="GIFT"
              >
                <option value="GIFT">Gift</option>
                <option value="CHAT">Comment</option>
                <option value="LIKE">Like</option>
                <option value="FOLLOW">Follow</option>
                <option value="SHARE">Share</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conditionField">Condition field</Label>
              <select
                id="conditionField"
                name="conditionField"
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue="giftName"
              >
                <option value="">No condition</option>
                <option value="giftName">giftName</option>
                <option value="comment">comment</option>
                <option value="username">username</option>
                <option value="giftCount">giftCount</option>
                <option value="likeCount">likeCount</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="operator">Operator</Label>
                <select
                  id="operator"
                  name="operator"
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  defaultValue="EQUALS"
                >
                  <option value="EQUALS">Equals</option>
                  <option value="CONTAINS">Contains</option>
                  <option value="GREATER_THAN">Greater than</option>
                  <option value="LESS_THAN">Less than</option>
                  <option value="EXISTS">Exists</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conditionValue">Value</Label>
                <Input id="conditionValue" name="conditionValue" placeholder="Rose" />
              </div>
            </div>
            <SubmitButton pendingLabel="Creating...">
              <Plus />
              Add Rule
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
