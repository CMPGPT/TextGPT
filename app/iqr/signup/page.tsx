import { RegisterForm } from "@/components/auth/RegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "IQR.codes - Sign Up",
  description: "Create your IQR.codes account to start building AI-powered SMS experiences.",
};

export default function IQRSignUpPage() {
  return <RegisterForm />;
} 