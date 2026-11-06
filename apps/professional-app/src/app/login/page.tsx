"use client";

import dynamic from "next/dynamic";

// Client-only: in server HTML, credentials typed or autofilled before hydration never reach React state
const LoginForm = dynamic(() => import("./LoginForm").then((module) => module.LoginForm), {
  ssr: false,
});

export default function LoginPage() {
  return <LoginForm />;
}
