import React from 'react';

interface WorkerSplashScreenProps {
    subtitle?: string;
    onDismiss?: () => void;
}

export function WorkerSplashScreen({ subtitle = 'PORTAL MCS' }: WorkerSplashScreenProps) {
    return (
        <div className="fixed inset-0 w-screen h-screen z-[99999] flex items-center justify-center overflow-hidden select-none bg-[radial-gradient(circle_at_50%_48%,#07152d_0%,#030712_72%)]">
            <div className="relative flex flex-col items-center justify-center p-5">
                {/* Glow Aura & Aneis de Luz Neon Azul/Verde */}
                <div className="absolute w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(0,242,254,0.24)_0%,rgba(16,185,129,0.18)_45%,transparent_70%)] blur-[35px] animate-pulse pointer-events-none" />
                
                <div className="absolute w-[290px] h-[290px] rounded-full border-[1.5px] border-cyan-400/30 shadow-[0_0_25px_rgba(0,242,254,0.25),inset_0_0_25px_rgba(16,185,129,0.2)] pointer-events-none animate-pulse" />
                
                <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-emerald-400/40 pointer-events-none animate-[spin_24s_linear_infinite]" />

                {/* Logo MCS Centralizado */}
                <div className="relative z-10 w-[136px] h-[136px] flex items-center justify-center mb-7 animate-[bounce_3s_ease-in-out_infinite]">
                    <img 
                        src="/icon-512.png" 
                        alt="MCS" 
                        className="w-full h-full object-contain rounded-3xl drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] drop-shadow-[0_0_18px_rgba(0,242,254,0.35)]"
                    />
                </div>

                {/* Barra de Progresso / Loading Neon */}
                <div className="relative z-10 w-[210px] h-1 bg-white/10 border border-white/15 rounded-full overflow-hidden mb-3.5 backdrop-blur-xs">
                    <div className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-[#00f2fe] to-[#10b981] shadow-[0_0_10px_#10b981,0_0_18px_#00f2fe] animate-[barSweep_1.6s_cubic-bezier(0.65,0,0.35,1)_infinite]" />
                </div>

                {/* Subtítulo */}
                <div className="relative z-10 text-[11px] font-bold tracking-[0.22em] text-slate-400 uppercase opacity-90">
                    {subtitle}
                </div>
            </div>
        </div>
    );
}
