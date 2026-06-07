import { Cpu, Lock, Sparkles, Zap } from 'lucide-react'
import Image from 'next/image'

export function Features() {
    return (
        <section className="overflow-hidden py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
                <div className="relative z-10 max-w-2xl">
                    <h2 className="text-4xl font-semibold lg:text-5xl">Built for AI-driven feedback</h2>
                    <p className="mt-6 text-lg text-slate-500">Empower your preparation with mock interviews that adapt to your needs, powered by an advanced AI Agents interface.</p>
                </div>
                <div className="relative -mx-4 rounded-3xl p-3 md:-mx-12 lg:col-span-3">
                    <div className="[perspective:800px]">
                        <div className="[transform:skewY(-2deg)skewX(-2deg)rotateX(6deg)]">
                            <div 
                                className="aspect-[88/36] relative overflow-hidden"
                                style={{ 
                                    maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%), linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)',
                                    maskComposite: 'intersect',
                                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%), linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%)',
                                    WebkitMaskComposite: 'source-in'
                                }}
                            >
                                <div className="[background-image:radial-gradient(var(--tw-gradient-stops,at_75%_25%))] to-background z-1 -inset-[4.25rem] absolute from-transparent to-75%"></div>
                                <Image 
                                    src="/images/lumen-dashboard.png" 
                                    className="absolute inset-0 z-10 w-full h-full object-cover object-top" 
                                    alt="Lumen Dashboard" 
                                    width={2797} 
                                    height={1137} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Zap className="size-4 text-indigo-500" />
                            <h3 className="text-sm font-medium text-slate-900">Instant Results</h3>
                        </div>
                        <p className="text-muted-foreground text-sm text-slate-500">Get your quantified coaching right after every mock interview session.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Cpu className="size-4 text-indigo-500" />
                            <h3 className="text-sm font-medium text-slate-900">Multimodal AI</h3>
                        </div>
                        <p className="text-muted-foreground text-sm text-slate-500">Evaluating your voice, words, and facial expressions simultaneously.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Lock className="size-4 text-indigo-500" />
                            <h3 className="text-sm font-medium text-slate-900">Private & Secure</h3>
                        </div>
                        <p className="text-muted-foreground text-sm text-slate-500">Your mock interviews and feedback are kept secure and strictly confidential.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-indigo-500" />
                            <h3 className="text-sm font-medium text-slate-900">Actionable Coaching</h3>
                        </div>
                        <p className="text-muted-foreground text-sm text-slate-500">Receive precise tips tailored to your specific answers to improve.</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
