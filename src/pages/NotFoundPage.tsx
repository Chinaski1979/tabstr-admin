import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl font-bold">404</p>
      <p className="text-muted-foreground">This page does not exist.</p>
      <Button asChild variant="outline">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
