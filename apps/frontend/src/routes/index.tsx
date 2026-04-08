import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <div>
      <h1>Fisio App</h1>
      <Link to="/patient/welcome">Welcome page</Link>
    </div>
  );
}
