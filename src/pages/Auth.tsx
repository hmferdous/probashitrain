import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import PasswordStrength, { scorePassword } from "@/components/PasswordStrength";
import GoogleButton from "@/components/GoogleButton";

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Name too short").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});
const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required").max(72),
});

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signupPw, setSignupPw] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!termsAccepted) {
      toast.error("You must accept the terms and conditions to sign up");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (scorePassword(parsed.data.password).score < 3) {
      toast.error("Please choose a stronger password");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: parsed.data.full_name },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created!");
    navigate("/onboarding");
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back!");
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6 text-primary-foreground">
          <div className="h-10 w-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold">
            <GraduationCap className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold">Probashi Skills</span>
        </Link>
        <Card className="p-6 shadow-elegant">
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign in
                </Button>
              </form>
              <Divider />
              <GoogleButton label="Sign in with Google" />
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Your name</Label>
                  <Input id="su-name" name="full_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Password</Label>
                  <Input
                    id="su-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    value={signupPw}
                    onChange={(e) => setSignupPw(e.target.value)}
                  />
                  <PasswordStrength password={signupPw} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create training center account
                </Button>
              </form>
              <Divider />
              <GoogleButton label="Sign up with Google" />
            </TabsContent>
          </Tabs>
        </Card>
        <p className="text-center text-xs text-primary-foreground/70 mt-4">
          B2B platform for training centers in Bangladesh
        </p>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-[11px] uppercase">
        <span className="bg-card px-2 text-muted-foreground">or</span>
      </div>
    </div>
  );
}
