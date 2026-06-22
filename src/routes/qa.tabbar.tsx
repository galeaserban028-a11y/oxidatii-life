import { createFileRoute } from "@tanstack/react-router";
import { BottomTabBar } from "@/components/app/BottomTabBar";

// QA-only route to runtime-test the BottomTabBar across viewports.
// Safe to delete once verification is complete.
export const Route = createFileRoute("/qa/tabbar")({
  component: () => (
    <div style={{ minHeight: "100vh", background: "#0F0D1C", color: "white", padding: 16 }}>
      <h1 style={{ fontSize: 14, opacity: 0.6 }}>QA — Bottom Tab Bar matrix</h1>
      <div style={{ height: 2000 }} />
      <BottomTabBar />
    </div>
  ),
});
