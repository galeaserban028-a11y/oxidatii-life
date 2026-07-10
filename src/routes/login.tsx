import { createFileRoute, redirect } from "@tanstack/react-router";

// Login and signup are unified into a single flow at /signup.
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/signup", replace: true });
  },
  component: () => null,
});
