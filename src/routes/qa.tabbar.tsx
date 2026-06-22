import { createFileRoute } from "@tanstack/react-router";
import { BottomTabBar } from "@/components/app/BottomTabBar";

export const Route = createFileRoute("/qa/tabbar")({
  component: () => (
    <div style={{ minHeight: "100vh", background: "#0F0D1C", color: "white", padding: 16 }}>
      <h1>QA tabbar</h1>
      <div style={{ height: 2000 }}>scroll content</div>
      <BottomTabBar />
    </div>
  ),
});
