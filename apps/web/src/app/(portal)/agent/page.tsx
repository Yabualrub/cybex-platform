import RequireService from "@/components/guards/RequireService";
import AgentUI from "./AgentUI";

export default function AgentPage() {
  return (
    <RequireService service="ai_agent">
      <AgentUI />
    </RequireService>
  );
}
