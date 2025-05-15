import { LoginForm } from "@/components/auth/LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "IQR.codes - Login",
  description: "Sign in to your IQR.codes account to manage your business and QR codes.",
};

export default function IQRLoginPage() {
  return <LoginForm />;
} 