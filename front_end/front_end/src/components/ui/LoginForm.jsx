import { useState } from "react"
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, User, AlertCircle } from "lucide-react";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError("Authentication failed. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-50 px-4 font-tight selection:bg-[#064e3b] selection:text-white">
            {/* Softened the card radius and added a subtle emerald glow on shadow */}
            <Card className="w-full max-w-[420px] rounded-2xl border-zinc-200 bg-white shadow-[0_20px_50px_rgba(6,78,59,0.05)] overflow-hidden">
                
                {/* Accent bar remains sharp but tucked inside the radius */}
                <div className="h-1.5 w-full bg-[#064e3b]" /> 

                <CardHeader className="pt-12 pb-8 flex flex-col items-center">
                    {/* Person icon now uses the forest green accent for the stroke */}
                    <div className="w-20 h-20 rounded-full bg-zinc-900 border-4 border-[#064e3b]/20 flex items-center justify-center mb-6 shadow-xl">
                        <User size={36} className="text-white" strokeWidth={1.5} />
                    </div>

                    <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-900">
                        Welcome back.
                    </CardTitle>
                    <CardDescription className="text-zinc-500 text-sm mt-1">
                        Sign in to your dashboard to continue
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-10 pb-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                          <Alert variant="destructive" className="border-red-100 bg-red-50 text-red-900 rounded-lg">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                          </Alert>
                        )}

                        <div className="space-y-5">
                            {/* Tags are now standard Sentence case for a cleaner look */}
                            <div className="group space-y-1.5">
                                <label className="text-sm font-medium text-zinc-700 transition-colors group-focus-within:text-[#064e3b]">
                                    Email address
                                </label>
                                <Input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-12 border-zinc-200 rounded-lg px-3 text-zinc-900 focus-visible:ring-1 focus-visible:ring-[#064e3b] focus-visible:border-[#064e3b] transition-all placeholder:text-zinc-400"
                                    placeholder="eugene@dto.com"
                                    required
                                />
                            </div>

                            <div className="group space-y-1.5 relative">
                                <label className="text-sm font-medium text-zinc-700 transition-colors group-focus-within:text-[#064e3b]">
                                    Password
                                </label>
                                <div className="relative">
                                    <Input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12 border-zinc-200 rounded-lg px-3 text-zinc-900 focus-visible:ring-1 focus-visible:ring-[#064e3b] focus-visible:border-[#064e3b] transition-all placeholder:text-zinc-400 w-full"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#064e3b] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                             <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 border-zinc-300 rounded text-[#064e3b] focus:ring-[#064e3b]" />
                                <span className="text-xs text-zinc-500 font-medium">Keep me logged in</span>
                             </label>
                             <button type="button" className="text-xs font-semibold text-[#064e3b] hover:text-[#053e2f] transition-colors">
                                Forgot password?
                             </button>
                        </div>
                        
                        <Button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full h-12 bg-[#064e3b] text-white hover:bg-[#053e2f] rounded-lg font-semibold text-sm transition-all duration-200 shadow-lg shadow-emerald-900/10 active:scale-[0.98]"
                        >
                            {isLoading ? "Authenticating..." : "Sign In"}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex justify-center border-t border-zinc-100 bg-zinc-50/50 py-6">
                    <p className="text-xs text-zinc-500 font-medium">
                        Need an account? <button className="text-[#064e3b] font-bold hover:underline underline-offset-4 ml-1">Request access</button>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}